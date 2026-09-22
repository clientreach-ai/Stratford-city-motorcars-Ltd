import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { photoVariantSrc, type PhotoVariants } from "@Stratford-city-motorcars-Ltd/core/vehicle";
import { env } from "@Stratford-city-motorcars-Ltd/env/server";

import type { ProcessedPhoto } from "./photos";

/**
 * Vehicle media in S3-compatible object storage (Cloudflare R2).
 *
 * Photos are uploaded to this API (multipart), processed (see photos.ts), and
 * written to the bucket under one generated id:
 *
 *   vehicles/<vehicleId>/<uuid>.webp            the master — the recorded `src`
 *   vehicles/<vehicleId>/<uuid>-<width>[r<n>].<fmt>
 *                                               delivery variants (AVIF, WebP)
 *                                               of encoding revision n
 *   originals/<vehicleId>/<uuid>.<ext>          the untouched upload; private,
 *                                               never served (it keeps camera
 *                                               metadata such as GPS)
 *
 * Every file of a photograph shares its id, so removing a photograph removes
 * all of them, and nothing is left behind in the bucket.
 *
 * What is recorded on the car depends on how the bucket is exposed:
 *  - a public base URL (r2.dev or a custom domain) → `https://…/vehicles/…`
 *  - no public URL (the R2 API endpoint is private) → the site path
 *    `/media/<vehicleId>/<uuid>.webp`, which the website's `/media` route and
 *    this API's `GET /media/*` serve from the bucket.
 */

export const MEDIA_PATH_PREFIX = "/media/";
const OBJECT_PREFIX = "vehicles/";
const ORIGINALS_PREFIX = "originals/";
/** `<vehicleId>/<uuid>.<ext>` or, for a variant, `<vehicleId>/<uuid>-<width>[r<revision>].<ext>`. */
const FILE_PATTERN = /^([A-Za-z0-9_-]{1,64})\/([0-9a-f-]{36}(?:-\d{2,4}(?:r\d{1,3})?)?\.(?:webp|jpg|png|avif))$/;

const CONTENT_TYPES = { avif: "image/avif", webp: "image/webp" } as const;
/** Every stored file is named once and never rewritten. */
const IMMUTABLE = "public, max-age=31536000, immutable";

export interface MediaStorage {
  /** Stores a processed photograph — original, master and variants — and returns the `src` to record. */
  putPhoto(vehicleId: string, photo: ProcessedPhoto): Promise<string>;
  /** Adds variants of an encoding revision beside an already stored master (the variants migration). */
  putVariants(src: string, variants: ProcessedPhoto["variants"], revision: number): Promise<void>;
  /** Deletes every file of the photograph behind a recorded `src`, if it is one of ours. */
  remove(src: string): Promise<void>;
  /**
   * Deletes a stored photograph's variant files that are not in `keep` (its
   * recorded variants) — files of an earlier revision, once no cached page
   * can still point at them. Never touches the master or the original.
   * With `apply: false` it only counts them.
   */
  pruneVariants(src: string, keep: PhotoVariants, options?: { apply?: boolean }): Promise<number>;
  /** The untouched upload behind a recorded `src`, when one was kept (photographs stored since originals were kept). */
  readOriginal(src: string): Promise<{ bytes: Uint8Array; name: string; type: string } | null>;
  /** Opens `<vehicleId>/<file>` for the media proxy, or null when missing. */
  open(path: string): Promise<{ body: ReadableStream<Uint8Array>; size: number; type: string; etag: string } | null>;
}

let cached: MediaStorage | null | undefined;

/** The configured storage, or null when the upload settings are incomplete. */
export function getMediaStorage(): MediaStorage | null {
  if (cached !== undefined) return cached;

  const { UPLOAD_BUCKET, UPLOAD_ACCESS_KEY_ID, UPLOAD_SECRET_ACCESS_KEY, UPLOAD_PUBLIC_BASE_URL, UPLOAD_REGION } = env;
  const r2Api = r2ApiOrigin(UPLOAD_PUBLIC_BASE_URL);
  const endpoint = env.UPLOAD_ENDPOINT ?? r2Api;
  if (!UPLOAD_BUCKET || !UPLOAD_ACCESS_KEY_ID || !UPLOAD_SECRET_ACCESS_KEY || !endpoint) {
    console.warn("[media] photo uploads are off: set UPLOAD_BUCKET, UPLOAD_ACCESS_KEY_ID, UPLOAD_SECRET_ACCESS_KEY and UPLOAD_ENDPOINT.");
    cached = null;
    return cached;
  }

  const client = new S3Client({
    region: UPLOAD_REGION,
    endpoint,
    credentials: { accessKeyId: UPLOAD_ACCESS_KEY_ID, secretAccessKey: UPLOAD_SECRET_ACCESS_KEY },
    // R2 (and most S3-compatible endpoints that are not AWS) address buckets by
    // path rather than by subdomain of the endpoint host.
    forcePathStyle: true,
  });

  // A genuinely public base URL is used as-is; otherwise media is proxied.
  const publicBase = UPLOAD_PUBLIC_BASE_URL && !r2Api ? UPLOAD_PUBLIC_BASE_URL.replace(/\/+$/, "") : null;
  if (!publicBase) {
    console.info("[media] no public bucket URL: photos are recorded as /media/… and served through the API.");
  }

  const srcFor = (path: string) =>
    publicBase ? `${publicBase}/${OBJECT_PREFIX}${path}` : `${MEDIA_PATH_PREFIX}${path}`;

  const pathOf = (src: string): string | null => {
    let path: string | null = null;
    if (src.startsWith(MEDIA_PATH_PREFIX)) path = src.slice(MEDIA_PATH_PREFIX.length);
    else if (publicBase && src.startsWith(`${publicBase}/${OBJECT_PREFIX}`)) {
      path = src.slice(publicBase.length + 1 + OBJECT_PREFIX.length);
    }
    return path && FILE_PATTERN.test(path) ? path : null;
  };

  const write = (key: string, body: Uint8Array, contentType: string, cacheControl = IMMUTABLE) =>
    client.send(
      new PutObjectCommand({ Bucket: UPLOAD_BUCKET, Key: key, Body: body, ContentType: contentType, CacheControl: cacheControl }),
    );

  const writeVariants = (path: string, variants: ProcessedPhoto["variants"], revision: number) =>
    Promise.all(
      variants.map((variant) => {
        const file = photoVariantSrc(`/${path}`, variant.width, variant.format, revision).slice(1);
        if (!FILE_PATTERN.test(file)) throw new Error("Invalid media path");
        return write(`${OBJECT_PREFIX}${file}`, variant.bytes, CONTENT_TYPES[variant.format]);
      }),
    );

  cached = {
    async putPhoto(vehicleId, photo) {
      const id = crypto.randomUUID();
      const path = `${vehicleId}/${id}.webp`;
      if (!FILE_PATTERN.test(path)) throw new Error("Invalid media path");
      // The original first: if anything later fails, remove() still finds it by id.
      await write(`${ORIGINALS_PREFIX}${vehicleId}/${id}.${photo.original.extension}`, photo.original.bytes, photo.original.contentType, "private, no-store");
      await Promise.all([write(`${OBJECT_PREFIX}${path}`, photo.master.bytes, "image/webp"), writeVariants(path, photo.variants, photo.revision)]);
      return srcFor(path);
    },

    async putVariants(src, variants, revision) {
      const path = pathOf(src);
      if (!path) throw new Error(`Not a stored photograph: ${src}`);
      await writeVariants(path, variants, revision);
    },

    async pruneVariants(src, keep, { apply = true } = {}) {
      const path = pathOf(src);
      if (!path) return 0;
      const stem = path.replace(/\.[a-z]+$/, "");
      const wanted = new Set(
        keep.widths.flatMap((width) =>
          keep.formats.map((format) => `${OBJECT_PREFIX}${photoVariantSrc(`/${path}`, width, format, keep.revision).slice(1)}`),
        ),
      );
      const listed = await client.send(new ListObjectsV2Command({ Bucket: UPLOAD_BUCKET, Prefix: `${OBJECT_PREFIX}${stem}-` }));
      const stale = (listed.Contents ?? [])
        .map((object) => object.Key)
        .filter((key): key is string => !!key && !wanted.has(key));
      if (stale.length === 0 || !apply) return stale.length;
      await client.send(
        new DeleteObjectsCommand({ Bucket: UPLOAD_BUCKET, Delete: { Objects: stale.map((Key) => ({ Key })), Quiet: true } }),
      );
      return stale.length;
    },

    async remove(src) {
      const path = pathOf(src);
      if (!path) return;
      // `<vehicleId>/<uuid>`: the master, its variants and its original all start with it.
      const stem = path.replace(/\.[a-z]+$/, "");
      const keys: string[] = [];
      for (const prefix of [`${OBJECT_PREFIX}${stem}`, `${ORIGINALS_PREFIX}${stem}`]) {
        const listed = await client.send(new ListObjectsV2Command({ Bucket: UPLOAD_BUCKET, Prefix: prefix }));
        for (const object of listed.Contents ?? []) if (object.Key) keys.push(object.Key);
      }
      if (keys.length === 0) return;
      await client.send(
        new DeleteObjectsCommand({ Bucket: UPLOAD_BUCKET, Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true } }),
      );
    },

    async readOriginal(src) {
      const path = pathOf(src);
      if (!path) return null;
      const stem = path.replace(/\.[a-z]+$/, "");
      const listed = await client.send(new ListObjectsV2Command({ Bucket: UPLOAD_BUCKET, Prefix: `${ORIGINALS_PREFIX}${stem}.` }));
      const key = listed.Contents?.[0]?.Key;
      if (!key) return null;
      const object = await client.send(new GetObjectCommand({ Bucket: UPLOAD_BUCKET, Key: key }));
      if (!object.Body) return null;
      return { bytes: await object.Body.transformToByteArray(), name: key.slice(key.lastIndexOf("/") + 1), type: object.ContentType ?? "" };
    },

    async open(path) {
      if (!FILE_PATTERN.test(path)) return null;
      try {
        const object = await client.send(
          new GetObjectCommand({ Bucket: UPLOAD_BUCKET, Key: `${OBJECT_PREFIX}${path}` }),
        );
        if (!object.Body) return null;
        return {
          body: object.Body.transformToWebStream(),
          size: object.ContentLength ?? 0,
          type: object.ContentType ?? "",
          // S3 returns the ETag already quoted, which is what the header wants.
          etag: object.ETag ?? "",
        };
      } catch {
        return null;
      }
    },
  };
  return cached;
}

/** Deletes the stored objects behind these sources. Failures are logged, never thrown. */
export async function removeStoredMedia(sources: string[]): Promise<void> {
  const storage = getMediaStorage();
  if (!storage || sources.length === 0) return;
  const results = await Promise.allSettled(sources.map((src) => storage.remove(src)));
  results.forEach((result) => {
    if (result.status === "rejected") console.error("[media] could not delete a stored photo:", String(result.reason));
  });
}

/** `https://<account>.r2.cloudflarestorage.com` when the URL is on the private R2 API host. */
function r2ApiOrigin(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const parsed = new URL(url);
  return parsed.hostname.endsWith(".r2.cloudflarestorage.com") ? parsed.origin : undefined;
}
