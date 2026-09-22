import { ValidationError } from "@Stratford-city-motorcars-Ltd/core/errors";
import type { PhotoVariantFormat } from "@Stratford-city-motorcars-Ltd/core/vehicle";
import { meetsPhotoSize, MINIMUM_PHOTO_SIZE } from "@Stratford-city-motorcars-Ltd/core/visibility";
import { availableParallelism } from "node:os";
import { deflateSync } from "node:zlib";

import { decodeHeic, HeicTooLargeError } from "./heic";
import sharp, { type Sharp } from "sharp";

/**
 * Photograph processing for uploads.
 *
 *   upload → validate → decode (HEIC included) → upright → sRGB
 *          → master (the recorded `src`) + delivery variants + blurred preview
 *
 * Accepts JPEG, PNG, WebP, AVIF and HEIC/HEIF up to 25 MB and at least 400 × 300
 * (either orientation; see MINIMUM_PHOTO_SIZE). Photos under the recommended
 * 1200 × 800 are kept — the listing checklist suggests replacing them.
 *
 * What is produced:
 *  - The ORIGINAL upload, byte for byte, kept privately so the photograph can
 *    be reprocessed later without a second generation of loss. It is never
 *    served: it keeps the camera's metadata.
 *  - The MASTER: up to 2560 px on the long side, WebP at high quality. It is the
 *    photograph's `src` — what older clients, the admin, share cards and
 *    structured data use.
 *  - VARIANTS for the website: AVIF (preferred) and WebP at the widths the
 *    layouts actually ask for, never wider than the master. The website
 *    serves these directly; nothing is recompressed on the way to the buyer.
 *  - A PLACEHOLDER: a ~24 px blurred WebP as a data: URL, painted instantly
 *    while the real photograph loads.
 *
 * Every derived file is made from the decoded original in one pass, turned
 * upright from its EXIF orientation and converted to sRGB with its colour
 * profile honoured, so wide-gamut phone photographs keep their true paint
 * colour. Derived files carry no metadata — no GPS location from phones.
 *
 * Quality was chosen by measurement against the originals (SSIM, VMAF and
 * zoomed side-by-side comparisons), not by size alone: see encode() below.
 */

/**
 * Sized for a small server (512 MB, part of a CPU). Measured on a 12 MP JPEG:
 * encoding every file at once peaked at 740 MB (1.3 GB for a 48 MP HEIC), so
 * files are encoded one after another — the same CPU time, since a small
 * server cannot run them side by side anyway — libvips keeps no cache between
 * photographs, and uses at most two threads (a container can report the
 * host's cores). One photograph is processed at a time per server; a second
 * upload waits its turn (see exclusive()).
 */
sharp.cache(false);
sharp.concurrency(Math.min(2, availableParallelism()));

export const MAX_PHOTO_BYTES = 25 * 1024 * 1024;
/** Guards against decompression bombs: about a 200-megapixel photograph. */
const MAX_INPUT_PIXELS = 200_000_000;
const MASTER_LONG_SIDE = 2560;
const MASTER_WEBP_QUALITY = 90;

/**
 * Widths the website's layouts request — thumbnails, cards, the gallery and
 * the hero at 1×, 2× and 3× densities. The steps are close enough that a
 * browser is never sent much more than it draws: a 412 px phone at 1.75×
 * needs 721 px and gets 750 (not 828, 30% more pixels); a 430 px phone at 3×
 * showing the 2× file needs 864 and gets 960 (not 1080). Variants are made
 * only up to the master's own width, which is always included as the largest.
 */
export const VARIANT_WIDTHS = [320, 480, 640, 750, 828, 960, 1080, 1280, 1600, 1920, 2560] as const;
export const VARIANT_FORMATS: PhotoVariantFormat[] = ["avif", "webp"];
/**
 * Bump when widths or encoder settings change: it is part of every variant's
 * file name (see photoVariantSrc), and `photos:variants` re-encodes stored
 * photographs of an older revision.
 *   1  AVIF 68/60, WebP 82/76, 320–2560 in 7 steps
 *   2  AVIF 60/56 effort 3, WebP 78/72, 320–2560 in 11 steps (never shipped)
 *   3  AVIF 62/58 effort 2 — the same measured quality as 2 for 40% less
 *      encoding CPU and 4% more bytes, for a small server
 */
export const VARIANT_REVISION = 3;

/**
 * Quality, chosen by measurement on the stored library: eight photographs at
 * 828 px, scored against an uncompressed resize with SSIM and VMAF, and
 * checked zoomed side by side on badges, brickwork and wheel spokes.
 *
 *                              KB   SSIM    VMAF
 *   image optimiser (q75)    26.3  0.945   89.7   badge lettering smeared
 *   AVIF 60, effort 3        43.2  0.969   93.8
 *   AVIF 62, effort 2        45.1  0.968   93.9   ← up to 1280 px
 *   AVIF 68, effort 3        58.1  0.979   95.3
 *   WebP 78 (fallback)       ~57   0.973   ~94
 *
 * AVIF at this level is indistinguishable from 68 zoomed in (1.5 VMAF apart;
 * a visible difference is ~6) at three quarters of the bytes, and keeps the
 * detail the optimiser lost. The 1600–2560 variants only reach high-density screens,
 * where each pixel is a fraction of the size, so they sit a step lower. 4:2:0
 * colour: 4:4:4 cost more bytes for no visible difference on paint and trim.
 *
 * Encoder effort trades CPU for bytes at a given quality. The API runs on a
 * small instance, so AVIF uses effort 2 with the quality a step up: the same
 * SSIM/VMAF as effort 3 at 40% less CPU (effort 5 would save ~5% of bytes at
 * several times the CPU).
 */
const ENCODE_EFFORT = { avif: 2, webp: 4 } as const;

function encode(pipeline: Sharp, format: PhotoVariantFormat, width: number): Sharp {
  const large = width > 1280;
  return format === "avif"
    ? pipeline.avif({ quality: large ? 58 : 62, effort: ENCODE_EFFORT.avif, chromaSubsampling: "4:2:0" })
    : pipeline.webp({ quality: large ? 72 : 78, effort: ENCODE_EFFORT.webp, smartSubsample: true });
}

export interface ProcessedPhoto {
  /** The encoding revision the variants were made with (VARIANT_REVISION). */
  revision: number;
  original: { bytes: Uint8Array; extension: string; contentType: string };
  master: { bytes: Uint8Array; width: number; height: number };
  variants: { width: number; format: PhotoVariantFormat; bytes: Uint8Array }[];
  placeholder: string;
}

const FORMAT_DETAILS: Record<string, { extension: string; contentType: string }> = {
  jpeg: { extension: "jpg", contentType: "image/jpeg" },
  png: { extension: "png", contentType: "image/png" },
  webp: { extension: "webp", contentType: "image/webp" },
  avif: { extension: "avif", contentType: "image/avif" },
  heic: { extension: "heic", contentType: "image/heic" },
};

/** ISO-BMFF brands used by HEIC/HEIF (HEVC) photographs, as iPhones write them. */
const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"]);

function isHeic(input: Buffer): boolean {
  if (input.length < 12 || input.toString("ascii", 4, 8) !== "ftyp") return false;
  return HEIC_BRANDS.has(input.toString("ascii", 8, 12));
}

/**
 * The ICC profile a HEIC carries in its `colr` box (iPhones write Display P3).
 * The WebAssembly decoder returns bare pixels, so without this the colours
 * would be read as sRGB: reds dulled, greens shifted.
 */
function heicIccProfile(input: Buffer): Buffer | null {
  for (let at = input.indexOf("colrprof"); at >= 4; at = input.indexOf("colrprof", at + 8)) {
    const size = input.readUInt32BE(at - 4);
    if (size > 12 && at - 4 + size <= input.length) return input.subarray(at + 8, at - 4 + size);
  }
  return null;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(bytes: Buffer): number {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Tags a PNG with an ICC profile (an `iCCP` chunk after IHDR) without touching
 * its pixels, so sharp converts it to sRGB through that profile on reading —
 * the same colour-managed path as a JPEG from a phone.
 */
function tagPng(png: Buffer, icc: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from("icc\0\0", "latin1"), deflateSync(icc)]);
  const typed = Buffer.concat([Buffer.from("iCCP", "latin1"), body]);
  const chunk = Buffer.alloc(12 + body.length);
  chunk.writeUInt32BE(body.length, 0);
  typed.copy(chunk, 4);
  chunk.writeUInt32BE(crc32(typed), 8 + body.length);
  const afterHeader = 8 + 25; // signature + IHDR
  return Buffer.concat([png.subarray(0, afterHeader), chunk, png.subarray(afterHeader)]);
}

/**
 * Opens the upload as a sharp pipeline. sharp reads JPEG, PNG, WebP and AVIF
 * natively; HEIC needs the HEVC decoder, which sharp's prebuilt binaries leave
 * out, so HEIC is decoded in WebAssembly (heic.ts) and handed over as raw
 * pixels.
 */
async function open(input: Buffer): Promise<{ image: () => Sharp; format: string; width: number; height: number }> {
  try {
    const metadata = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
    const format = metadata.format === "heif" ? (metadata.compression === "av1" ? "avif" : "heic") : metadata.format;
    if (format && format !== "heic" && FORMAT_DETAILS[format] && metadata.width && metadata.height) {
      // EXIF orientations 5–8 are rotated a quarter turn.
      const turned = (metadata.orientation ?? 1) >= 5;
      return {
        image: () => sharp(input, { failOn: "error", limitInputPixels: MAX_INPUT_PIXELS }).rotate(),
        format,
        width: turned ? metadata.height : metadata.width,
        height: turned ? metadata.width : metadata.height,
      };
    }
  } catch {
    // Fall through: HEIC, or not an image at all.
  }

  if (!isHeic(input)) throw new Error("unsupported");
  let decoded: Awaited<ReturnType<typeof decodeHeic>>;
  try {
    decoded = await decodeHeic(input, MAX_INPUT_PIXELS);
  } catch (error) {
    throw new Error(error instanceof HeicTooLargeError ? "too-large" : "unsupported");
  }
  // Reduced to the master's size straight away, so only one full-size copy of
  // the pixels ever exists. Still in the file's own colour space: the profile
  // is applied below, as for any other photograph.
  const { data: pixels, info } = await sharp(decoded.pixels, {
    raw: { width: decoded.width, height: decoded.height, channels: 4 },
    limitInputPixels: MAX_INPUT_PIXELS,
  })
    .resize({ width: MASTER_LONG_SIDE, height: MASTER_LONG_SIDE, fit: "inside", withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const raw = { raw: { width: info.width, height: info.height, channels: 4 as const } };
  const icc = heicIccProfile(input);
  // Lossless and fast: the PNG only carries the pixels and their profile across.
  const tagged = icc ? tagPng(await sharp(pixels, raw).png({ compressionLevel: 0 }).toBuffer(), icc) : null;
  return {
    image: () => (tagged ? sharp(tagged) : sharp(pixels, raw)),
    format: "heic",
    // The photograph's own size, for the minimum-size check.
    width: decoded.width,
    height: decoded.height,
  };
}

export async function processPhoto(file: File): Promise<ProcessedPhoto> {
  const name = file.name || "This file";
  if (file.size > MAX_PHOTO_BYTES) {
    throw new ValidationError({ file: `“${name}” is larger than 25 MB.` }, "This photograph is too large.");
  }

  const input = Buffer.from(await file.arrayBuffer());
  return exclusive(() => decodeAndDerive(input, name));
}

async function decodeAndDerive(input: Buffer, name: string): Promise<ProcessedPhoto> {
  let source: Awaited<ReturnType<typeof open>>;
  try {
    source = await open(input);
  } catch (error) {
    if (error instanceof Error && error.message === "too-large") {
      throw new ValidationError({ file: `“${name}” has too many pixels to process.` }, "This photograph is too large.");
    }
    throw new ValidationError(
      { file: `“${name}” is not a JPEG, PNG, WebP, AVIF or HEIC photograph.` },
      "This file type is not supported.",
    );
  }

  if (!meetsPhotoSize({ width: source.width, height: source.height }, MINIMUM_PHOTO_SIZE)) {
    throw new ValidationError(
      {
        file: `“${name}” is ${source.width}×${source.height}. Photographs need to be at least ${MINIMUM_PHOTO_SIZE.long}×${MINIMUM_PHOTO_SIZE.short}.`,
      },
      "This photograph is too small.",
    );
  }

  try {
    return await derive(source.image, FORMAT_DETAILS[source.format]!, input);
  } catch {
    throw new ValidationError({ file: `“${name}” could not be read as an image.` }, "This photograph could not be processed.");
  }
}

let turn: Promise<unknown> = Promise.resolve();

/** Runs photograph processing one at a time, in arrival order, so two uploads never hold two photographs' memory at once. */
function exclusive<T>(task: () => Promise<T>): Promise<T> {
  const result = turn.then(task, task);
  turn = result.catch(() => undefined);
  return result;
}

/**
 * Makes the master, variants and placeholder from an opened photograph. Also
 * used by the migration that brings photographs stored before variants
 * existed up to date (scripts/generate-photo-variants.ts), with the stored
 * master as the source.
 */
export async function derive(
  image: () => Sharp,
  originalFormat: { extension: string; contentType: string },
  originalBytes: Uint8Array,
): Promise<ProcessedPhoto> {
  // Upright, at most MASTER_LONG_SIDE, and converted into sRGB through the
  // photograph's own colour profile (an iPhone's Display P3, say) — not merely
  // relabelled, which would dull reds and shift greens. Every other file comes
  // from this.
  const decoded = await image()
    .withIccProfile("srgb")
    .resize({ width: MASTER_LONG_SIDE, height: MASTER_LONG_SIDE, fit: "inside", withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let { data: base, info } = decoded;
  // Transparency (a cut-out PNG) is kept: AVIF and WebP both carry it. A
  // photograph with no transparent pixels loses its alpha channel (a decoded
  // HEIC always arrives as RGBA) — checked on the reduced copy, not by decoding
  // the full-size original a second time.
  if (info.channels === 4) {
    // `isOpaque`, not extractChannel(3): four raw channels can be read as CMYK.
    const { isOpaque } = await sharp(base, { raw: { width: info.width, height: info.height, channels: 4 } }).stats();
    if (isOpaque) {
      ({ data: base, info } = await sharp(base, { raw: { width: info.width, height: info.height, channels: 4 } })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true }));
    }
  }
  const fromBase = () => sharp(base, { raw: { width: info.width, height: info.height, channels: info.channels } });

  const widths = [...VARIANT_WIDTHS.filter((width) => width < info.width), info.width];

  // One file at a time: see the note on sharp.concurrency above.
  const master = await fromBase().webp({ quality: MASTER_WEBP_QUALITY, effort: ENCODE_EFFORT.webp, smartSubsample: true }).toBuffer();
  const placeholder = await fromBase().resize({ width: 24 }).blur(1.2).webp({ quality: 50 }).toBuffer();
  const variants: ProcessedPhoto["variants"] = [];
  for (const width of widths) {
    for (const format of VARIANT_FORMATS) {
      const bytes = await encode(fromBase().resize({ width, kernel: "lanczos3" }), format, width).toBuffer();
      variants.push({ width, format, bytes: new Uint8Array(bytes) });
    }
  }

  return {
    revision: VARIANT_REVISION,
    original: { bytes: originalBytes, ...originalFormat },
    master: { bytes: new Uint8Array(master), width: info.width, height: info.height },
    variants,
    placeholder: `data:image/webp;base64,${placeholder.toString("base64")}`,
  };
}
