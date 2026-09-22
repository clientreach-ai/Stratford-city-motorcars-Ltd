import { cachePath, keepInCache, readFromBucket } from "@/lib/media/bucket";
import { isValidMediaKey, openFileAt, resolveMediaPath } from "@/lib/media/storage";

/**
 * Serves vehicle media.
 *
 * File names are generated at upload and never reused, so responses are cached
 * as immutable for a year. Byte-range requests are supported because Safari
 * will not play a video without them, and they let buyers seek a walkaround
 * without downloading all of it.
 *
 * Only keys matching `<vehicleId>/<generated>.<webp|avif|jpg|mp4|webm>`
 * resolve; anything else — traversal attempts included — is a 404. Photograph
 * delivery variants (`<uuid>-<width>[r<n>].avif|webp`) are ordinary keys.
 *
 * Where a file comes from, in order:
 *  1. local media on this server's disk (`MEDIA_ROOT`)
 *  2. this server's cache of files already read from the bucket or the API
 *  3. the object store directly, when the website has read access to it
 *     (lib/media/bucket.ts) — the API does not need to be awake
 *  4. the API (`MEDIA_PROXY_ORIGIN`), which serves the same bucket
 * A complete photograph read from 3 or 4 is kept in the cache, so each file is
 * fetched from outside once per server.
 *
 * `Vercel-CDN-Cache-Control` also lets a CDN in front (Vercel's, if the site
 * moves there) keep its own copy.
 */

/** Browser and CDN caching for files that are named once and never change. */
const IMMUTABLE = "public, max-age=31536000, immutable";
const CACHE_HEADERS = { "Cache-Control": IMMUTABLE, "Vercel-CDN-Cache-Control": IMMUTABLE };

/**
 * The API can be asleep (a free or idle instance takes several seconds to
 * wake). Wait long enough for that, and try once more before giving up, so a
 * first visitor after a quiet spell still gets the photograph.
 */
const PROXY_TIMEOUT_MS = 25_000;

const CONTENT_TYPES: Record<string, string> = {
  webp: "image/webp",
  avif: "image/avif",
  jpg: "image/jpeg",
  mp4: "video/mp4",
  webm: "video/webm",
};

function parseRange(header: string | null, size: number): { start: number; end: number } | "invalid" | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return "invalid";
  const [, rawStart, rawEnd] = match;
  if (rawStart === "" && rawEnd === "") return "invalid";
  let start: number;
  let end: number;
  if (rawStart === "") {
    const suffix = Number(rawEnd);
    start = Math.max(size - suffix, 0);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === "" ? size - 1 : Math.min(Number(rawEnd), size - 1);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) return "invalid";
  return { start, end };
}

const PROXIED_HEADERS = ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"];

/** Photographs are kept in the cache when read whole; videos (ranged, large) are not. */
const CACHEABLE = new Set(["webp", "avif", "jpg"]);

/**
 * Sends a body on to the browser and, for a complete photograph, keeps a copy
 * in the cache as it goes — only if every byte the source promised arrives.
 */
function passThrough(key: string, body: ReadableStream<Uint8Array>, cache: boolean, length: string | null): ReadableStream<Uint8Array> {
  if (!cache) return body;
  const [toBrowser, toCache] = body.tee();
  void keepInCache(key, toCache, length ? Number(length) : undefined);
  return toBrowser;
}

/** Streams a stored photo from the API server, or 404s when there is no API. */
async function proxyToApi(request: Request, key: string, cache: boolean): Promise<Response> {
  const origin = process.env.MEDIA_PROXY_ORIGIN?.trim().replace(/\/+$/, "");
  if (!origin || !/^https?:\/\//.test(origin) || !isValidMediaKey(key)) return new Response("Not found", { status: 404 });

  const range = request.headers.get("range");
  const attempt = () =>
    fetch(`${origin}/media/${key}`, {
      headers: range ? { range } : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
    }).catch(() => null);
  let upstream = await attempt();
  // A 404 is an answer; a timeout or a 5xx from a waking server is worth one retry.
  if (!upstream || upstream.status >= 500) upstream = await attempt();
  if (!upstream || !(upstream.ok || upstream.status === 206)) return new Response("Not found", { status: 404 });

  const headers = new Headers({ ...CACHE_HEADERS, "X-Content-Type-Options": "nosniff" });
  for (const name of PROXIED_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  const body = upstream.body && upstream.status === 200 ? passThrough(key, upstream.body, cache, upstream.headers.get("content-length")) : upstream.body;
  return new Response(body, { status: upstream.status, headers });
}

/** Serves a file from one of this server's own folders, with range support; null when it is not there. */
async function serveFromDisk(request: Request, path: string | null, contentType: string): Promise<Response | null> {
  if (!path) return null;
  const head = await openFileAt(path, { start: 0, end: 0 });
  if (!head) return null;
  await head.stream.cancel();

  const baseHeaders = {
    "Content-Type": contentType,
    ...CACHE_HEADERS,
    "Accept-Ranges": "bytes",
    "Last-Modified": head.modified.toUTCString(),
    "X-Content-Type-Options": "nosniff",
  };

  const range = parseRange(request.headers.get("range"), head.size);
  if (range === "invalid") {
    return new Response(null, { status: 416, headers: { ...baseHeaders, "Content-Range": `bytes */${head.size}` } });
  }

  const file = await openFileAt(path, range ?? undefined);
  if (!file) return null;

  if (range) {
    return new Response(file.stream, {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Length": String(file.length),
        "Content-Range": `bytes ${range.start}-${range.start + file.length - 1}/${file.size}`,
      },
    });
  }

  return new Response(file.stream, { headers: { ...baseHeaders, "Content-Length": String(file.size) } });
}

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const key = path.join("/");
  const extension = key.split(".").pop() ?? "";
  const contentType = CONTENT_TYPES[extension];
  if (!contentType || !isValidMediaKey(key)) return new Response("Not found", { status: 404 });

  const local = (await serveFromDisk(request, resolveMediaPath(key), contentType)) ?? (await serveFromDisk(request, cachePath(key), contentType));
  if (local) return local;

  const range = request.headers.get("range");
  const cache = !range && CACHEABLE.has(extension);
  const stored = await readFromBucket(key, range);
  if (stored) {
    return new Response(passThrough(key, stored.body, cache, stored.headers["Content-Length"] ?? null), {
      status: stored.status,
      headers: { "Content-Type": contentType, ...stored.headers, ...CACHE_HEADERS, "Accept-Ranges": "bytes", "X-Content-Type-Options": "nosniff" },
    });
  }
  return proxyToApi(request, key, cache);
}
