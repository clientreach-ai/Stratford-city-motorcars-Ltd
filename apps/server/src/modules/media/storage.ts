import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { env } from "@Stratford-city-motorcars-Ltd/env/server";

/**
 * Vehicle media in S3-compatible object storage (Cloudflare R2).
 *
 * Photos are uploaded to this API (multipart), processed, and written to the
 * bucket under a generated key: `vehicles/<vehicleId>/<uuid>.webp`.
 *
 * What is recorded on the car depends on how the bucket is exposed:
 *  - a public base URL (r2.dev or a custom domain) → `https://…/vehicles/…`
 *  - no public URL (the R2 API endpoint is private) → the site path
 *    `/media/<vehicleId>/<uuid>.webp`, which the website's `/media` route and
 *    this API's `GET /media/*` serve from the bucket.
 */

export const MEDIA_PATH_PREFIX = "/media/";
const OBJECT_PREFIX = "vehicles/";
const FILE_PATTERN = /^([A-Za-z0-9_-]{1,64})\/([0-9a-f-]{36}\.(?:webp|jpg|png|avif))$/;

export interface MediaStorage {
  /** Stores bytes and returns the `src` to record on the car. */
  put(vehicleId: string, extension: string, bytes: Uint8Array, contentType: string): Promise<string>;
  /** Deletes the object behind a recorded `src`, if it is one of ours. */
  remove(src: string): Promise<void>;
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

  cached = {
    async put(vehicleId, extension, bytes, contentType) {
      const path = `${vehicleId}/${crypto.randomUUID()}.${extension}`;
      if (!FILE_PATTERN.test(path)) throw new Error("Invalid media path");
      await client.send(
        new PutObjectCommand({
          Bucket: UPLOAD_BUCKET,
          Key: `${OBJECT_PREFIX}${path}`,
          Body: bytes,
          ContentType: contentType,
        }),
      );
      return srcFor(path);
    },

    async remove(src) {
      const path = pathOf(src);
      if (!path) return;
      await client.send(
        new DeleteObjectCommand({ Bucket: UPLOAD_BUCKET, Key: `${OBJECT_PREFIX}${path}` }),
      );
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
