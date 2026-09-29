import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { photoPreviewSrc, type VehicleImage } from "../inventory/types";
import { SHARE_IMAGE } from "../seo";
import { cachePath, readFromBucket } from "./bucket";
import { MEDIA_URL_PREFIX, isValidMediaKey, openFileAt, resolveMediaPath } from "./storage";

/**
 * The picture a link preview shows when a car's page is shared.
 *
 * WhatsApp is where most enquiries start, and its previews quietly drop images
 * that are large or WebP — which is exactly what a stored photograph is. So
 * each car gets a 1200×630 JPEG cut from its cover photograph: the size and
 * format every preview (WhatsApp, Facebook, iMessage, X) handles.
 */

/** Stored photographs are at most 2560px wide; this only stops a rogue file. */
const MAX_INPUT_PIXELS = 40_000_000;

/**
 * A link preview is fetched by a crawler that gives up within seconds, so a
 * sleeping API is not worth waiting for as long as the /media route does: the
 * site-wide image is served instead, and cached only briefly.
 */
const API_TIMEOUT_MS = 10_000;

async function bytesOf(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  return Buffer.from(await new Response(stream).arrayBuffer());
}

/**
 * A stored photograph's bytes, looked for where the /media route looks and in
 * the same order: this server's disk, its cache, the bucket, then the API.
 */
async function readStoredFile(key: string): Promise<Buffer | null> {
  if (!isValidMediaKey(key)) return null;

  for (const file of [resolveMediaPath(key), cachePath(key)]) {
    const opened = file ? await openFileAt(file) : null;
    if (opened) return bytesOf(opened.stream);
  }

  const stored = await readFromBucket(key, null);
  if (stored) return bytesOf(stored.body);

  const origin = process.env.MEDIA_PROXY_ORIGIN?.trim().replace(/\/+$/, "");
  if (!origin || !/^https?:\/\//.test(origin)) return null;
  const upstream = await fetch(`${origin}/media/${key}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  }).catch(() => null);
  return upstream?.ok && upstream.body ? bytesOf(upstream.body) : null;
}

/** Reads a photograph from wherever the public site serves it. */
async function readPhotograph(src: string): Promise<Buffer | null> {
  if (src.startsWith(`${MEDIA_URL_PREFIX}/`)) return readStoredFile(src.slice(MEDIA_URL_PREFIX.length + 1));

  // Seed stock ships its photographs in `public/`. Remote URLs are not fetched.
  if (!src.startsWith("/") || src.includes("..")) return null;
  const root = path.join(process.cwd(), "public");
  const full = path.resolve(root, `.${src}`);
  if (!full.startsWith(root + path.sep)) return null;
  return readFile(/*turbopackIgnore: true*/ full).catch(() => null);
}

/**
 * The car's cover photograph cropped to the share size, or null when it cannot
 * be read or decoded so the caller can fall back.
 */
export async function renderShareImage(image: VehicleImage): Promise<Buffer | null> {
  // Start from the smallest stored variant that still fills the frame once
  // cropped (a wide panorama needs more width than a 4:3 shot), rather than the
  // full-size photograph. The original is the fallback if the variant is missing.
  const width = Math.ceil(Math.max(SHARE_IMAGE.width, (SHARE_IMAGE.height * image.width) / image.height));
  const preview = photoPreviewSrc(image, width);
  const candidates = preview === image.src ? [image.src] : [preview, image.src];

  for (const src of candidates) {
    try {
      const input = await readPhotograph(src);
      if (!input) continue;
      return await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
        .rotate()
        // Cars are photographed centred, so a centre crop keeps the car in
        // frame; the wider frame mostly trims sky and ground.
        .resize(SHARE_IMAGE.width, SHARE_IMAGE.height, { fit: "cover", position: "centre" })
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer();
    } catch {
      // An undecodable file: try the next candidate.
    }
  }
  return null;
}

/** The site-wide share image, for a car whose photograph cannot be read. */
export async function readDefaultShareImage(): Promise<Buffer | null> {
  // A literal path, so output tracing ships the file with the function.
  return readFile(path.join(process.cwd(), "public/brand/og-default.jpg")).catch(() => null);
}
