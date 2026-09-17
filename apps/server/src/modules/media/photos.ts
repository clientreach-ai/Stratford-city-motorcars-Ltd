import { ValidationError } from "@Stratford-city-motorcars-Ltd/core/errors";
import { meetsPhotoSize, MINIMUM_PHOTO_SIZE } from "@Stratford-city-motorcars-Ltd/core/visibility";
import sharp, { type Metadata } from "sharp";

/**
 * Photograph processing for uploads.
 *
 * Accepts JPEG, PNG, WebP or AVIF up to 25 MB and at least 400 × 300 (either
 * orientation; see MINIMUM_PHOTO_SIZE). Photos under the recommended
 * 1200 × 800 are kept — the listing checklist suggests replacing them. The image is turned upright from its EXIF orientation, reduced
 * to at most 2400 px on the long side and re-encoded as WebP. Re-encoding drops
 * every piece of metadata, including GPS location from phone cameras.
 */

export const MAX_PHOTO_BYTES = 25 * 1024 * 1024;
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
  if (!meetsPhotoSize({ width, height }, MINIMUM_PHOTO_SIZE)) {
    throw new ValidationError(
      {
        file: `“${name}” is ${width}×${height}. Photographs need to be at least ${MINIMUM_PHOTO_SIZE.long}×${MINIMUM_PHOTO_SIZE.short}.`,
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
