import "server-only";

import { createReadStream } from "node:fs";
import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

/**
 * ============================================================================
 * INTEGRATION POINT — where uploaded vehicle media is kept.
 * ============================================================================
 *
 * The dashboard uploads photographs and walkaround videos through this
 * interface; the public site links to them by URL. Two implementations are
 * planned; one is built:
 *
 *  - `local` (built): files on the server's disk under `MEDIA_ROOT`
 *    (default `apps/web/.data/media`), served by `app/media/[...path]` with
 *    long-lived immutable caching. Suitable for development and for a single
 *    server with a persistent disk. Not suitable for serverless hosting, whose
 *    filesystem is ephemeral.
 *  - object storage (not built — needs an account): an S3-compatible bucket
 *    (Cloudflare R2, AWS S3…) behind a CDN, with `MEDIA_PUBLIC_BASE_URL`
 *    added to `images.remotePatterns` in `next.config.ts`. Implement
 *    `MediaStorage` against the provider's SDK and select it in
 *    `getMediaStorage()`.
 *
 * Keys are generated server-side (`<vehicleId>/<random>.<ext>`), never taken
 * from the uploaded filename.
 */
export interface MediaStorage {
  readonly kind: "local";
  /** Stores bytes under `key` and returns the public URL path. */
  put(key: string, bytes: Uint8Array, contentType: string): Promise<{ src: string; bytes: number }>;
  /** Removes a stored object. Missing objects are ignored. */
  remove(src: string): Promise<void>;
}

export const MEDIA_URL_PREFIX = "/media";

/** Keys and paths: a vehicle id folder, then a generated file name. Nothing else. */
const KEY_PATTERN = /^[A-Za-z0-9_-]{1,64}\/[A-Za-z0-9_-]{8,64}\.(webp|jpg|mp4|webm)$/;

export function isValidMediaKey(key: string): boolean {
  return KEY_PATTERN.test(key);
}

export function mediaRoot(): string {
  const configured = process.env.MEDIA_ROOT?.trim();
  return path.resolve(/*turbopackIgnore: true*/ configured || path.join(process.cwd(), ".data", "media"));
}

/** Resolves a key to a file path, refusing anything that escapes the media root. */
export function resolveMediaPath(key: string): string | null {
  if (!isValidMediaKey(key)) return null;
  const root = mediaRoot();
  const full = path.resolve(root, key);
  return full.startsWith(root + path.sep) ? full : null;
}

export function createLocalMediaStorage(): MediaStorage {
  return {
    kind: "local",

    async put(key, bytes) {
      const target = resolveMediaPath(key);
      if (!target) throw new Error("Invalid media key");
      // Media lives outside the build: runtime data, not code to trace.
      await mkdir(/*turbopackIgnore: true*/ path.dirname(target), { recursive: true });
      // Write to a temporary name first so a half-written file is never served.
      const temporary = `${target}.${process.pid}.tmp`;
      await writeFile(/*turbopackIgnore: true*/ temporary, bytes, { flag: "wx" });
      await rename(/*turbopackIgnore: true*/ temporary, /*turbopackIgnore: true*/ target);
      return { src: `${MEDIA_URL_PREFIX}/${key}`, bytes: bytes.byteLength };
    },

    async remove(src) {
      if (!src.startsWith(`${MEDIA_URL_PREFIX}/`)) return;
      const target = resolveMediaPath(src.slice(MEDIA_URL_PREFIX.length + 1));
      if (target) await rm(/*turbopackIgnore: true*/ target, { force: true });
    },
  };
}

export function getMediaStorage(): MediaStorage {
  return createLocalMediaStorage();
}

/** Opens a stored file for streaming, optionally a byte range. */
export async function openMediaFile(
  key: string,
  range?: { start: number; end: number },
): Promise<{ stream: ReadableStream<Uint8Array>; size: number; length: number; modified: Date } | null> {
  const file = resolveMediaPath(key);
  if (!file) return null;
  const info = await stat(/*turbopackIgnore: true*/ file).catch(() => null);
  if (!info?.isFile()) return null;

  const start = range?.start ?? 0;
  const end = range ? Math.min(range.end, info.size - 1) : info.size - 1;
  const node = createReadStream(/*turbopackIgnore: true*/ file, { start, end });
  return {
    stream: Readable.toWeb(node) as ReadableStream<Uint8Array>,
    size: info.size,
    length: end - start + 1,
    modified: info.mtime,
  };
}
