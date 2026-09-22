/**
 * Brings stored photographs' delivery variants up to date.
 *
 *   pnpm --filter server photos:variants            # dry run: reports what it would do
 *   pnpm --filter server photos:variants -- --apply # generates, verifies, records
 *   pnpm --filter server photos:variants -- --prune # dry run of the clean-up below
 *   … -- --prune --apply   delete variant files a photograph no longer uses
 *
 * A photograph needs work when it has no variants, or variants of an older
 * encoding revision than VARIANT_REVISION (photos.ts) — bump that constant
 * after changing widths or quality, and run this. For each one:
 *   1. read its source: the untouched original when one was kept, otherwise
 *      the stored master (photographs from before originals were kept)
 *   2. make the AVIF/WebP variants and the blurred preview from it, exactly as
 *      an upload would (photos.ts)
 *   3. write the variants beside the master under the new revision's names,
 *      then read the largest back and check it decodes at the right size
 *   4. only then record `variants` and `placeholder` on the car, under the
 *      car's row lock and without changing its version, so an editor open in
 *      the admin can still save
 *
 * Safe to re-run: no master or original is ever rewritten or deleted, no `src`
 * changes, and nothing already stored is overwritten — a new revision has new
 * file names, so what browsers and the CDN cache as immutable stays true. A
 * photograph that fails is reported and left exactly as it was.
 *
 * The previous revision's files stay in the bucket, because pages cached
 * before the change still point at them. `--prune` removes them; run it once
 * those pages have been refreshed (a day later is ample).
 */
import { parseArgs } from "node:util";

import { photoVariantSrc, type VehicleImage } from "@Stratford-city-motorcars-Ltd/core/vehicle";
import sharp from "sharp";

import { revalidateWebsite } from "../src/lib/revalidate";
import { derive, processPhoto, VARIANT_REVISION, type ProcessedPhoto } from "../src/modules/media/photos";
import { getMediaStorage, MEDIA_PATH_PREFIX } from "../src/modules/media/storage";
import { listVehicles, withLockedVehicle, writeVehicle } from "../src/modules/vehicles/repository";

const { values } = parseArgs({
  args: process.argv.slice(2).filter((arg) => arg !== "--"),
  options: { apply: { type: "boolean", default: false }, prune: { type: "boolean", default: false } },
});
const apply = values.apply;

const storage = getMediaStorage();
if (!storage) {
  console.error("Photo storage is not configured (UPLOAD_* settings); nothing to do.");
  process.exit(1);
}

async function readAll(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  return Buffer.from(await new Response(stream).arrayBuffer());
}

const vehicles = await listVehicles();
const stored = vehicles.flatMap((vehicle) =>
  vehicle.record.media
    .filter((item): item is VehicleImage => item.kind === "image" && item.src.startsWith(MEDIA_PATH_PREFIX))
    .map((image) => ({ vehicleId: vehicle.record.id, title: vehicle.record.title, image })),
);

if (values.prune) {
  // Only photographs on the current revision: an outdated one still needs its files.
  const current = stored.filter(({ image }) => (image.variants?.revision ?? 1) === VARIANT_REVISION);
  console.log(`${current.length} photographs on revision ${VARIANT_REVISION}${apply ? "" : " (dry run — add --apply to delete)"}`);
  let removed = 0;
  for (const { title, image } of current) {
    const count = await storage.pruneVariants(image.src, image.variants!, { apply });
    if (count > 0) console.log(`  ${apply ? "✓" : "would remove"} ${count} old files · ${title} · ${image.src}`);
    removed += count;
  }
  console.log(apply ? `\n${removed} files removed.` : `\nDry run: ${removed} files would be removed.`);
  process.exit(0);
}

const pending = stored.filter(({ image }) => (image.variants?.revision ?? (image.variants ? 1 : 0)) < VARIANT_REVISION);
console.log(
  `${vehicles.length} vehicles, ${pending.length} of ${stored.length} photographs to bring to revision ${VARIANT_REVISION}${apply ? "" : " (dry run — add --apply to write)"}`,
);

/** From the kept original when there is one — a first-generation encode — otherwise from the stored master. */
async function reprocess(image: VehicleImage): Promise<{ processed: ProcessedPhoto; from: string }> {
  const original = await storage!.readOriginal(image.src);
  if (original) {
    const processed = await processPhoto(new File([original.bytes], original.name, { type: original.type }));
    return { processed, from: "original" };
  }
  const file = await storage!.open(image.src.slice(MEDIA_PATH_PREFIX.length));
  if (!file) throw new Error("master not found in the bucket");
  const master = await readAll(file.body);
  const processed = await derive(() => sharp(master, { failOn: "error" }), { extension: "webp", contentType: "image/webp" }, master);
  return { processed, from: "master" };
}

let done = 0;
let failed = 0;
for (const { vehicleId, title, image } of pending) {
  const label = `${title} · ${image.src}`;
  try {
    const { processed, from } = await reprocess(image);
    // The recorded size reserves the layout space: the new files must match it.
    if (processed.master.width !== image.width || processed.master.height !== image.height) {
      throw new Error(`source is ${processed.master.width}×${processed.master.height}, recorded ${image.width}×${image.height}`);
    }
    const widths = [...new Set(processed.variants.map((variant) => variant.width))].sort((a, b) => a - b);
    const kb = Math.round(processed.variants.reduce((sum, variant) => sum + variant.bytes.length, 0) / 1024);
    if (!apply) {
      console.log(`  would add ${processed.variants.length} variants (${widths.join("/")} px, ${kb} KB, from the ${from}) to ${label}`);
      continue;
    }

    await storage.putVariants(image.src, processed.variants, processed.revision);

    // Verify before recording: the largest AVIF must come back and decode at its width.
    const largest = widths[widths.length - 1]!;
    const check = await storage.open(photoVariantSrc(image.src, largest, "avif", processed.revision).slice(MEDIA_PATH_PREFIX.length));
    const decoded = check ? await sharp(await readAll(check.body)).metadata() : null;
    if (decoded?.width !== largest) throw new Error("variant did not verify after writing");

    const recorded = await withLockedVehicle(vehicleId, async (current, tx) => {
      const target = current?.record.media.find((item): item is VehicleImage => item.kind === "image" && item.id === image.id);
      if (!current || !target || target.src !== image.src) return false; // removed or replaced meanwhile
      target.variants = {
        widths,
        formats: [...new Set(processed.variants.map((variant) => variant.format))],
        revision: processed.revision,
      };
      target.placeholder = processed.placeholder;
      // updatedAt is left alone: the car's content has not changed.
      await writeVehicle(current, tx);
      return true;
    });
    if (recorded) {
      done++;
      console.log(`  ✓ ${label} — ${processed.variants.length} variants, ${kb} KB, from the ${from}`);
    } else {
      console.log(`  – ${label} — removed while processing, skipped`);
    }
  } catch (error) {
    failed++;
    console.error(`  ✗ ${label} — ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (apply && done > 0) {
  revalidateWebsite();
  // Let the revalidation request leave before the process exits.
  await new Promise((resolve) => setTimeout(resolve, 3000));
}
console.log(apply ? `\n${done} updated, ${failed} failed.` : `\nDry run complete. ${failed} could not be read.`);
process.exit(failed > 0 ? 1 : 0);
