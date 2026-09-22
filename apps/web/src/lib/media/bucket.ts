import "server-only";

import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { isValidMediaKey } from "./storage";

/**
 * Photographs read straight from the object store (Cloudflare R2), and kept on
 * this server's disk once read.
 *
 * Without this, every `/media` request is forwarded to the API, which on a
 * small instance sleeps when idle: the first visitor after a quiet spell
 * waited ~50 s for the photographs. With read access to the bucket the
 * website does not need the API awake to show a car:
 *
 *   MEDIA_BUCKET                    the bucket (the API's UPLOAD_BUCKET)
 *   MEDIA_BUCKET_ENDPOINT           https://<account>.r2.cloudflarestorage.com
 *   MEDIA_BUCKET_ACCESS_KEY_ID      a READ-ONLY token for that bucket
 *   MEDIA_BUCKET_SECRET_ACCESS_KEY
 *
 * Only `vehicles/` is ever read — the private originals beside it are not
 * reachable through this, whatever key is asked for.
 *
 * The disk cache: stored files are named once and never rewritten (see
 * photoVariantSrc), so a copy can never go stale. Each file is fetched from
 * the bucket once per server, then served from disk. The cache lives in
 * `MEDIA_CACHE_DIR` (default `.data/media-cache`); an ephemeral disk is fine —
 * after a deploy it simply refills.
 */

const OBJECT_PREFIX = "vehicles/";

let client: { s3: S3Client; bucket: string } | null | undefined;

function bucket(): { s3: S3Client; bucket: string } | null {
  if (client !== undefined) return client;
  const name = process.env.MEDIA_BUCKET?.trim();
  const endpoint = process.env.MEDIA_BUCKET_ENDPOINT?.trim();
  const accessKeyId = process.env.MEDIA_BUCKET_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.MEDIA_BUCKET_SECRET_ACCESS_KEY?.trim();
  client =
    name && endpoint && accessKeyId && secretAccessKey
      ? {
          bucket: name,
          s3: new S3Client({
            region: process.env.MEDIA_BUCKET_REGION?.trim() || "auto",
            endpoint,
            credentials: { accessKeyId, secretAccessKey },
            forcePathStyle: true,
          }),
        }
      : null;
  return client;
}

/** A stored file from the bucket, or null when it is missing or the bucket is not configured. */
export async function readFromBucket(
  key: string,
  range: string | null,
): Promise<{ body: ReadableStream<Uint8Array>; status: 200 | 206; headers: Record<string, string> } | null> {
  const store = bucket();
  if (!store || !isValidMediaKey(key)) return null;
  try {
    const object = await store.s3.send(
      new GetObjectCommand({ Bucket: store.bucket, Key: `${OBJECT_PREFIX}${key}`, Range: range ?? undefined }),
      { abortSignal: AbortSignal.timeout(15_000) },
    );
    if (!object.Body) return null;
    const headers: Record<string, string> = {};
    if (object.ContentType) headers["Content-Type"] = object.ContentType;
    if (object.ContentLength !== undefined) headers["Content-Length"] = String(object.ContentLength);
    if (object.ContentRange) headers["Content-Range"] = object.ContentRange;
    if (object.ETag) headers.ETag = object.ETag;
    if (object.LastModified) headers["Last-Modified"] = object.LastModified.toUTCString();
    return { body: object.Body.transformToWebStream(), status: object.ContentRange ? 206 : 200, headers };
  } catch {
    return null;
  }
}

export function mediaCacheRoot(): string {
  const configured = process.env.MEDIA_CACHE_DIR?.trim();
  return path.resolve(/*turbopackIgnore: true*/ configured || path.join(process.cwd(), ".data", "media-cache"));
}

/** The cache path for a key, refusing anything that escapes the cache root. */
export function cachePath(key: string): string | null {
  if (!isValidMediaKey(key)) return null;
  const root = mediaCacheRoot();
  const full = path.resolve(root, key);
  return full.startsWith(root + path.sep) ? full : null;
}

/**
 * Keeps a complete file on disk, written under a temporary name first so a
 * half-written file is never served. Best effort: a full or read-only disk
 * only means the next request goes back to the source.
 */
export async function keepInCache(key: string, stream: ReadableStream<Uint8Array>, expectedLength?: number): Promise<void> {
  const target = cachePath(key);
  if (!target) return;
  const temporary = `${target}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  try {
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    // A connection cut short is not a photograph.
    if (bytes.byteLength === 0 || (expectedLength !== undefined && bytes.byteLength !== expectedLength)) return;
    await mkdir(/*turbopackIgnore: true*/ path.dirname(target), { recursive: true });
    await writeFile(/*turbopackIgnore: true*/ temporary, bytes);
    await rename(/*turbopackIgnore: true*/ temporary, /*turbopackIgnore: true*/ target);
  } catch {
    await rm(/*turbopackIgnore: true*/ temporary, { force: true }).catch(() => undefined);
  }
}
