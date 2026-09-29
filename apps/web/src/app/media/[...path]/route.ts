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
 * A complete file also carries `Vercel-CDN-Cache-Control`, so Vercel's CDN
 * keeps it and repeat requests never reach this function. `Cache-Control`
 * alone only reaches browsers: Vercel does not cache a function's response on
 * `max-age`.
 *
 * A file that is not anywhere is remembered for a few minutes (`misses`), so a
 * burst of requests for made-up keys costs one trip to the bucket or the API
 * each rather than one per request.
 */

/** Files are named once and never change, so browsers may keep them for a year. */
const IMMUTABLE = "public, max-age=31536000, immutable";
/**
 * A complete file: browsers and the CDN. Partial (206) responses get only the
 * browser header — the CDN would store a slice of the file under the file's
 * own URL.
 */
const COMPLETE = { "Cache-Control": IMMUTABLE, "Vercel-CDN-Cache-Control": IMMUTABLE };
const PARTIAL = { "Cache-Control": IMMUTABLE };

/**
 * A 404 that a source actually answered ("no such file") may be kept briefly;
 * one caused by an unreachable source must not be, or a sleeping API would
 * hide a photograph that is there.
 */
const MISSING = "public, max-age=60";
const UNCERTAIN = "no-store";

function notFound(cacheControl: string): Response {
  return new Response("Not found", { status: 404, headers: { "Cache-Control": cacheControl } });
}

/** 416, with the size when it is known (RFC 9110 §15.5.17). Never cached: the header, not the file, was at fault. */
function rangeNotSatisfiable(size: number | null): Response {
  const headers: Record<string, string> = { "Cache-Control": UNCERTAIN, "Accept-Ranges": "bytes" };
  if (size !== null) headers["Content-Range"] = `bytes */${size}`;
  return new Response(null, { status: 416, headers });
}

/**
 * Keys every source said were missing, with when to forget them. Stored names
 * are only ever linked after their files are written, so a real photograph is
 * never asked for before it exists; the expiry is only a safety net. Bounded,
 * so a flood of made-up keys cannot grow it without limit — the oldest go
 * first.
 */
const MISS_TTL_MS = 5 * 60_000;
const MISS_LIMIT = 2_000;
const misses = new Map<string, number>();

function rememberMiss(key: string) {
  misses.delete(key);
  if (misses.size >= MISS_LIMIT) {
    const oldest = misses.keys().next().value;
    if (oldest !== undefined) misses.delete(oldest);
  }
  misses.set(key, Date.now() + MISS_TTL_MS);
}

function recentlyMissing(key: string): boolean {
  const until = misses.get(key);
  if (until === undefined) return false;
  if (until > Date.now()) return true;
  misses.delete(key);
  return false;
}

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

/**
 * The one form of `Range` this route honours: a single `bytes=start-end`,
 * `bytes=start-` or `bytes=-suffix`. Anything else (several ranges, a
 * malformed or reversed one) is null, and the whole file is served, as RFC
 * 9110 §14.2 allows.
 */
function rangeForm(header: string | null): { start: number | null; end: number | null } | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const [, rawStart, rawEnd] = match;
  if (rawStart === "" && rawEnd === "") return null;
  const start = rawStart === "" ? null : Number(rawStart);
  const end = rawEnd === "" ? null : Number(rawEnd);
  if ((start !== null && !Number.isSafeInteger(start)) || (end !== null && !Number.isSafeInteger(end))) return null;
  if (start !== null && end !== null && start > end) return null;
  return { start, end };
}

/** A honoured range against a known size: the bytes to send, or unsatisfiable when it starts past the end (416). */
function parseRange(header: string | null, size: number): { start: number; end: number } | "unsatisfiable" | null {
  const form = rangeForm(header);
  if (!form) return null;
  if (form.start === null) {
    if (form.end === 0) return "unsatisfiable";
    return { start: Math.max(size - form.end!, 0), end: size - 1 };
  }
  if (form.start >= size) return "unsatisfiable";
  return { start: form.start, end: form.end === null ? size - 1 : Math.min(form.end, size - 1) };
}

/** Not Content-Type: that always comes from the key's extension, whatever the source stored. */
const PROXIED_HEADERS = ["content-length", "content-range", "accept-ranges", "etag", "last-modified"];

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
async function proxyToApi(key: string, range: string | null, contentType: string, cache: boolean): Promise<Response> {
  const origin = process.env.MEDIA_PROXY_ORIGIN?.trim().replace(/\/+$/, "");
  if (!origin || !/^https?:\/\//.test(origin) || !isValidMediaKey(key)) return notFound(UNCERTAIN);

  const attempt = () =>
    fetch(`${origin}/media/${key}`, {
      headers: range ? { range } : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
    }).catch(() => null);
  // A body that won't be sent on is closed, so its connection is freed now rather than whenever it is collected.
  const discard = (response: Response | null) => void response?.body?.cancel().catch(() => undefined);

  let upstream = await attempt();
  // A 404 is an answer; a timeout or a 5xx from a waking server is worth one retry.
  if (!upstream || upstream.status >= 500) {
    discard(upstream);
    upstream = await attempt();
  }
  if (upstream?.status === 404) {
    // Not remembered, and not cached: the API also answers 404 when it failed
    // to read the bucket, so this doesn't prove the file isn't there.
    discard(upstream);
    return notFound(UNCERTAIN);
  }
  if (upstream?.status === 416) {
    discard(upstream);
    const size = /^bytes \*\/(\d+)$/.exec(upstream.headers.get("content-range") ?? "")?.[1];
    return rangeNotSatisfiable(size ? Number(size) : null);
  }
  if (!upstream || !(upstream.ok || upstream.status === 206)) {
    discard(upstream);
    return notFound(UNCERTAIN);
  }

  const headers = new Headers({ ...(upstream.status === 200 ? COMPLETE : PARTIAL), "X-Content-Type-Options": "nosniff" });
  for (const name of PROXIED_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("Content-Type", contentType);
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
    "Accept-Ranges": "bytes",
    "Last-Modified": head.modified.toUTCString(),
    "X-Content-Type-Options": "nosniff",
  };

  const range = parseRange(request.headers.get("range"), head.size);
  if (range === "unsatisfiable") return rangeNotSatisfiable(head.size);

  const file = await openFileAt(path, range ?? undefined);
  if (!file) return null;

  if (range) {
    return new Response(file.stream, {
      status: 206,
      headers: {
        ...baseHeaders,
        ...PARTIAL,
        "Content-Length": String(file.length),
        "Content-Range": `bytes ${range.start}-${range.start + file.length - 1}/${file.size}`,
      },
    });
  }

  return new Response(file.stream, { headers: { ...baseHeaders, ...COMPLETE, "Content-Length": String(file.size) } });
}

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const key = path.join("/");
  const extension = key.split(".").pop() ?? "";
  const contentType = CONTENT_TYPES[extension];
  if (!contentType || !isValidMediaKey(key)) return notFound(MISSING);

  const local = (await serveFromDisk(request, resolveMediaPath(key), contentType)) ?? (await serveFromDisk(request, cachePath(key), contentType));
  if (local) return local;
  if (recentlyMissing(key)) return notFound(MISSING);

  // Only a single, well-formed range is passed on; anything else is ignored and
  // the whole file served. That also keeps a malformed header away from the
  // bucket, which would reject it like any other failure.
  const requested = request.headers.get("range");
  const range = requested && rangeForm(requested) ? requested.trim() : null;

  const cache = !range && CACHEABLE.has(extension);
  const stored = await readFromBucket(key, range);
  switch (stored.kind) {
    case "file":
      return new Response(passThrough(key, stored.body, cache, stored.headers["Content-Length"] ?? null), {
        status: stored.status,
        headers: {
          ...stored.headers,
          ...(stored.status === 200 ? COMPLETE : PARTIAL),
          "Accept-Ranges": "bytes",
          "X-Content-Type-Options": "nosniff",
          // Last, so a type stored with the object can never override it.
          "Content-Type": contentType,
        },
      });
    case "unsatisfiable":
      return rangeNotSatisfiable(stored.size);
    case "missing":
      // The API reads the same bucket, so asking it too would only be slower.
      rememberMiss(key);
      return notFound(MISSING);
    case "unavailable":
      return proxyToApi(key, range, contentType, cache);
  }
}
