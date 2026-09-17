import { isValidMediaKey, openMediaFile } from "@/lib/media/storage";

/**
 * Serves uploaded vehicle media from local storage.
 *
 * File names are generated at upload and never reused, so responses are cached
 * as immutable for a year. Byte-range requests are supported because Safari
 * will not play a video without them, and they let buyers seek a walkaround
 * without downloading all of it.
 *
 * Only keys matching `<vehicleId>/<generated>.<webp|jpg|mp4|webm>` resolve;
 * anything else — traversal attempts included — is a 404.
 *
 * Photos uploaded through the admin live in object storage. When a key is not
 * on local disk and MEDIA_PROXY_ORIGIN is set (the API server), the request is
 * forwarded to `<MEDIA_PROXY_ORIGIN>/media/<key>`.
 */

const CONTENT_TYPES: Record<string, string> = {
  webp: "image/webp",
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

/** Streams a stored photo from the API server, or 404s when there is no API. */
async function proxyToApi(request: Request, key: string): Promise<Response> {
  const origin = process.env.MEDIA_PROXY_ORIGIN?.trim().replace(/\/+$/, "");
  if (!origin || !/^https?:\/\//.test(origin) || !isValidMediaKey(key)) return new Response("Not found", { status: 404 });

  const range = request.headers.get("range");
  const upstream = await fetch(`${origin}/media/${key}`, {
    headers: range ? { range } : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!upstream || !(upstream.ok || upstream.status === 206)) return new Response("Not found", { status: 404 });

  const headers = new Headers({
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  });
  for (const name of PROXIED_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const key = path.join("/");
  const extension = key.split(".").pop() ?? "";
  const contentType = CONTENT_TYPES[extension];
  if (!contentType) return new Response("Not found", { status: 404 });

  const head = await openMediaFile(key, { start: 0, end: 0 });
  if (!head) return proxyToApi(request, key);
  await head.stream.cancel();

  const baseHeaders = {
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=31536000, immutable",
    "Accept-Ranges": "bytes",
    "Last-Modified": head.modified.toUTCString(),
    "X-Content-Type-Options": "nosniff",
  };

  const range = parseRange(request.headers.get("range"), head.size);
  if (range === "invalid") {
    return new Response(null, { status: 416, headers: { ...baseHeaders, "Content-Range": `bytes */${head.size}` } });
  }

  const file = await openMediaFile(key, range ?? undefined);
  if (!file) return new Response("Not found", { status: 404 });

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
