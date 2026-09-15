import "server-only";

import { randomBytes } from "node:crypto";

import sharp, { type Metadata } from "sharp";

/**
 * Upload processing for vehicle media.
 *
 * Photographs are normalised once, at upload:
 *  - rotated according to their EXIF orientation, then all metadata is dropped
 *    (phone photos carry GPS coordinates and device details that must never be
 *    published)
 *  - scaled down to at most `MAX_EDGE` pixels on the long edge — sharper than
 *    any screen needs, far lighter than a 12-megapixel original
 *  - stored as WebP at quality 82, with the final pixel size recorded so every
 *    page can reserve layout space
 *
 * Responsive sizes (thumbnails, cards, gallery, full screen) are produced on
 * demand by the Next.js image optimiser from this one master, so nothing else
 * is pre-generated.
 */

export const MAX_EDGE = 2560;
export const MIN_EDGE = 800;
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

const ACCEPTED_IMAGE_FORMATS = new Set(["jpeg", "png", "webp", "avif", "heif", "tiff"]);

export class MediaRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaRejectedError";
  }
}

export function generateMediaId(): string {
  return randomBytes(9).toString("base64url");
}

export interface ProcessedImage {
  bytes: Uint8Array;
  width: number;
  height: number;
  contentType: "image/webp";
}

export async function processVehiclePhoto(input: Uint8Array): Promise<ProcessedImage> {
  if (input.byteLength > MAX_IMAGE_BYTES) {
    throw new MediaRejectedError("That photograph is larger than 25 MB. Export it at a smaller size and try again.");
  }

  let metadata: Metadata;
  try {
    metadata = await sharp(input, { failOn: "error" }).metadata();
  } catch {
    throw new MediaRejectedError("That file isn't a photograph we can read. Use a JPEG, PNG, WebP or AVIF image.");
  }

  if (!metadata.format || !ACCEPTED_IMAGE_FORMATS.has(metadata.format)) {
    throw new MediaRejectedError("That file isn't a photograph we can read. Use a JPEG, PNG, WebP or AVIF image.");
  }

  const longEdge = Math.max(metadata.width ?? 0, metadata.height ?? 0);
  if (longEdge < MIN_EDGE) {
    throw new MediaRejectedError(
      `That photograph is only ${longEdge}px across. Use one at least ${MIN_EDGE}px on its longest side so it looks sharp on the website.`,
    );
  }

  const { data, info } = await sharp(input, { failOn: "error" })
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .toColourspace("srgb")
    .webp({ quality: 82, effort: 5 })
    .toBuffer({ resolveWithObject: true });

  return { bytes: new Uint8Array(data), width: info.width, height: info.height, contentType: "image/webp" };
}

export type AcceptedVideoType = "video/mp4" | "video/webm" | "video/quicktime";

/**
 * Identifies a walkaround video from its first bytes rather than trusting the
 * browser-supplied type or file name. Videos are stored as uploaded — the site
 * does not transcode — so the dealership should export MP4 (H.264) from the
 * phone.
 */
export function detectVideoType(input: Uint8Array): AcceptedVideoType | null {
  if (input.byteLength < 12) return null;
  const ascii = (from: number, to: number) => String.fromCharCode(...input.slice(from, to));
  if (ascii(4, 8) === "ftyp") {
    return ascii(8, 12).startsWith("qt") ? "video/quicktime" : "video/mp4";
  }
  if (input[0] === 0x1a && input[1] === 0x45 && input[2] === 0xdf && input[3] === 0xa3) return "video/webm";
  return null;
}
