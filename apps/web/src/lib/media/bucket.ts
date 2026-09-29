import "server-only";

import { GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
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

/**
 * What the bucket said about a key. A miss is kept apart from a failure: the
 * bucket answering "no such file" is final, but wrong credentials or a network
 * fault say nothing about whether the file exists.
 */
export type BucketRead =
  /** Headers carry no Content-Type: the route derives it from the extension, whatever was stored. */
  | { kind: "file"; body: ReadableStream<Uint8Array>; status: 200 | 206; headers: Record<string, string> }
  | { kind: "missing" }
  /** The range starts past the end of the file; `size` when it could be learned. */
  | { kind: "unsatisfiable"; size: number | null }
  /** Not configured, or the read failed for a reason other than the file not being there. */
  | { kind: "unavailable" };

const READ_TIMEOUT_MS = 15_000;

/** Failures already logged — a wrong credential would otherwise log once per photograph. */
const logged = new Set<string>();

/** Logs a failure once per error name. Only the name: the key or message could carry details worth keeping out of logs. */
function logOnce(what: string, error: unknown) {
  const err = error as { code?: unknown; name?: unknown } | null;
  const name = typeof err?.code === "string" ? err.code : typeof err?.name === "string" ? err.name : "UnknownError";
  if (logged.has(`${what}:${name}`)) return;
  logged.add(`${what}:${name}`);
  console.warn(`[media] ${what}`, name);
}

function httpStatus(error: unknown): number | undefined {
  return (error as { $metadata?: { httpStatusCode?: number } } | null)?.$metadata?.httpStatusCode;
}

/** A stored file from the bucket. `range` must already be a well-formed single range — the route checks it. */
export async function readFromBucket(key: string, range: string | null): Promise<BucketRead> {
  const store = bucket();
  if (!store || !isValidMediaKey(key)) return { kind: "unavailable" };
  const objectKey = `${OBJECT_PREFIX}${key}`;
  // The time limit covers the wait for the bucket to answer, not the download:
  // the SDK ties the signal to the whole response, so a signal still live
  // would cut a slow visitor's video off mid-stream.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), READ_TIMEOUT_MS);
  try {
    const object = await store.s3
      .send(new GetObjectCommand({ Bucket: store.bucket, Key: objectKey, Range: range ?? undefined }), { abortSignal: controller.signal })
      .finally(() => clearTimeout(timer));
    if (!object.Body) return { kind: "unavailable" };
    const headers: Record<string, string> = {};
    if (object.ContentLength !== undefined) headers["Content-Length"] = String(object.ContentLength);
    if (object.ContentRange) headers["Content-Range"] = object.ContentRange;
    if (object.ETag) headers.ETag = object.ETag;
    if (object.LastModified) headers["Last-Modified"] = object.LastModified.toUTCString();
    return { kind: "file", body: object.Body.transformToWebStream(), status: object.ContentRange ? 206 : 200, headers };
  } catch (error) {
    const name = (error as { name?: unknown } | null)?.name;
    // Only the bucket saying "no such key" means the file isn't there. Any other
    // 404 (NoSuchBucket: a wrong bucket name) is a fault, and the API is asked.
    if (name === "NoSuchKey") return { kind: "missing" };
    if (name === "InvalidRange" || httpStatus(error) === 416) return { kind: "unsatisfiable", size: await objectSize(store, objectKey) };
    logOnce("bucket read failed", error);
    return { kind: "unavailable" };
  }
}

/** A stored file's size, for the `Content-Range` a 416 should carry. Only asked for then, so a normal read costs one request. */
async function objectSize(store: { s3: S3Client; bucket: string }, objectKey: string): Promise<number | null> {
  try {
    const head = await store.s3.send(new HeadObjectCommand({ Bucket: store.bucket, Key: objectKey }), {
      abortSignal: AbortSignal.timeout(READ_TIMEOUT_MS),
    });
    return head.ContentLength ?? null;
  } catch (error) {
    logOnce("bucket head failed", error);
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
  } catch (error) {
    logOnce("cache write failed", error);
    await rm(/*turbopackIgnore: true*/ temporary, { force: true }).catch(() => undefined);
  }
}
