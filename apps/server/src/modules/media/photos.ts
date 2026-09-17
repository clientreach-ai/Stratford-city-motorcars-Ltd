import { ValidationError } from "@Stratford-city-motorcars-Ltd/core/errors";
import sharp, { type Metadata } from "sharp";

/**
 * Photograph processing for uploads.
 *
 * Accepts JPEG, PNG, WebP or AVIF up to 25 MB and at least 1200 × 800 (either
 * orientation). The image is turned upright from its EXIF orientation, reduced
 * to at most 2400 px on the long side and re-encoded as WebP. Re-encoding drops
 * every piece of metadata, including GPS location from phone cameras.
 */

export const MAX_PHOTO_BYTES = 25 * 1024 * 1024;
const MIN_LONG_SIDE = 1200;
const MIN_SHORT_SIDE = 800;
const MAX_LONG_SIDE = 2400;
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp", "heif", "avif"]);

export async function processPhoto(file: File): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const name = file.name || "This file";
  if (file.size > MAX_PHOTO_BYTES) {
    throw new ValidationError({ file: `“${name}” is larger than 25 MB.` }, "This photograph is too large.");
  }

  const input = Buffer.from(await file.arrayBuffer());
  const unsupported = new ValidationError(
    { file: `“${name}” is not a JPEG, PNG, WebP or AVIF photograph.` },
    "This file type is not supported.",
  );

  let metadata: Metadata;
  try {
    metadata = await sharp(input).metadata();
  } catch {
    throw unsupported;
  }
  if (!metadata.format || !ACCEPTED_FORMATS.has(metadata.format) || !metadata.width || !metadata.height) throw unsupported;

  // EXIF orientations 5–8 are rotated a quarter turn.
  const turned = (metadata.orientation ?? 1) >= 5;
  const width = turned ? metadata.height : metadata.width;
  const height = turned ? metadata.width : metadata.height;
  if (Math.max(width, height) < MIN_LONG_SIDE || Math.min(width, height) < MIN_SHORT_SIDE) {
    throw new ValidationError(
      {
        file: `“${name}” is ${width}×${height}. Photographs need to be at least ${MIN_LONG_SIDE}×${MIN_SHORT_SIDE} to look sharp on the website.`,
      },
      "This photograph is too small.",
    );
  }

  try {
    const { data, info } = await sharp(input, { failOn: "error" })
      .rotate()
      .resize({ width: MAX_LONG_SIDE, height: MAX_LONG_SIDE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    return { bytes: new Uint8Array(data), width: info.width, height: info.height };
  } catch {
    throw new ValidationError({ file: `“${name}” could not be read as an image.` }, "This photograph could not be processed.");
  }
}
