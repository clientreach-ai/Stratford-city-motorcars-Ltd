import { revalidateTag } from "next/cache";

import { INVENTORY_CACHE_TAG } from "@/lib/inventory/repository";
import { parseVehicleRecord } from "@/lib/inventory/schema";
import { getInventoryStore } from "@/lib/inventory/store";
import { PHOTO_CATEGORIES, type PhotoCategory, type VehicleMedia } from "@/lib/inventory/types";
import {
  detectVideoType,
  generateMediaId,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  MediaRejectedError,
  processVehiclePhoto,
} from "@/lib/media/process";
import { getMediaStorage } from "@/lib/media/storage";
import { getStaffSession } from "@/lib/server/staff";

/**
 * Uploads photographs and walkaround videos for one car (dashboard only).
 *
 * Checks, in order: a signed-in staff session, a same-origin request, a known
 * car, then each file individually — so one unreadable photo does not lose the
 * rest of a batch. Photos are processed (orientation, metadata stripped,
 * resized, WebP) before storage; videos are identified by content.
 */
export async function POST(request: Request) {
  const user = await getStaffSession();
  if (!user) return Response.json({ ok: false, message: "Please sign in again." }, { status: 401 });

  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host && origin !== process.env.BETTER_AUTH_URL?.replace(/\/$/, "")) {
    return Response.json({ ok: false, message: "Request refused." }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ ok: false, message: "The upload was incomplete. Please try again." }, { status: 400 });
  }

  const vehicleId = String(form.get("vehicleId") ?? "");
  const category = (PHOTO_CATEGORIES as readonly string[]).includes(String(form.get("category")))
    ? (String(form.get("category")) as PhotoCategory)
    : "exterior";
  const files = form.getAll("files").filter((entry): entry is File => entry instanceof File && entry.size > 0);

  const store = await getInventoryStore();
  if (!store.writable) return Response.json({ ok: false, message: "Inventory storage is not connected." }, { status: 503 });
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(vehicleId) || !(await store.getById(vehicleId))) {
    return Response.json({ ok: false, message: "That car wasn't found." }, { status: 404 });
  }
  if (!files.length) return Response.json({ ok: false, message: "Choose at least one file." }, { status: 400 });
  if (files.length > 40) return Response.json({ ok: false, message: "Upload up to 40 files at a time." }, { status: 400 });

  const storage = getMediaStorage();
  const added: VehicleMedia[] = [];
  const failures: { file: string; message: string }[] = [];
  const displayName = (file: File) => file.name.slice(0, 80) || "File";

  for (const file of files) {
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const videoType = detectVideoType(bytes);
      const id = generateMediaId();

      if (videoType) {
        if (bytes.byteLength > MAX_VIDEO_BYTES) throw new MediaRejectedError("Videos can be up to 200 MB. Trim it or upload it to YouTube and paste the link.");
        const extension = videoType === "video/webm" ? "webm" : "mp4";
        const stored = await storage.put(`${vehicleId}/${id}.${extension}`, bytes, videoType);
        added.push({
          id,
          kind: "video",
          title: "Walkaround video",
          source: { type: "file", src: stored.src, mimeType: videoType === "video/webm" ? "video/webm" : "video/mp4" },
          provenance: "dealer",
        });
        continue;
      }

      if (bytes.byteLength > MAX_IMAGE_BYTES) throw new MediaRejectedError("Photos can be up to 25 MB.");
      const photo = await processVehiclePhoto(bytes);
      const stored = await storage.put(`${vehicleId}/${id}.webp`, photo.bytes, photo.contentType);
      added.push({
        id,
        kind: "image",
        src: stored.src,
        width: photo.width,
        height: photo.height,
        alt: "",
        category,
        provenance: "dealer",
      });
    } catch (error) {
      failures.push({
        file: displayName(file),
        message: error instanceof MediaRejectedError ? error.message : "This file couldn't be processed.",
      });
      if (!(error instanceof MediaRejectedError)) {
        console.error("[media] upload failed:", error instanceof Error ? `${error.name}: ${error.message}` : error);
      }
    }
  }

  // Re-read just before saving so uploads never overwrite edits made meanwhile.
  const latest = await store.getById(vehicleId);
  if (!latest) return Response.json({ ok: false, message: "That car wasn't found." }, { status: 404 });
  let record = latest;
  if (added.length) {
    record = parseVehicleRecord({ ...latest, media: [...latest.media, ...added], updatedAt: new Date().toISOString() });
    await store.save(record);
    revalidateTag(INVENTORY_CACHE_TAG, { expire: 0 });
  }

  const photos = added.filter((item) => item.kind === "image").length;
  const videos = added.length - photos;
  const summary = [photos ? `${photos} photo${photos === 1 ? "" : "s"}` : "", videos ? `${videos} video${videos === 1 ? "" : "s"}` : ""]
    .filter(Boolean)
    .join(" and ");

  return Response.json(
    {
      ok: failures.length === 0,
      message: added.length
        ? `Added ${summary}.${failures.length ? ` ${failures.length} file${failures.length === 1 ? "" : "s"} couldn't be added.` : " Add a description to each photo."}`
        : "Nothing was added.",
      failures,
      record,
    },
    { status: added.length ? 200 : 422 },
  );
}
