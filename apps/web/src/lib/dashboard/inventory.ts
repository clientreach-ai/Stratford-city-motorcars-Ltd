import "server-only";

import { getInventoryStore } from "@/lib/inventory/store";
import type { VehicleImage, VehicleRecord } from "@/lib/inventory/types";
import { LISTING_PHOTO_TARGET, isPubliclyVisible, publicationIssues } from "@/lib/inventory/visibility";

/** Read helpers for dashboard views: always the live store, never the public cache. */

export async function loadAllRecords(): Promise<VehicleRecord[]> {
  const store = await getInventoryStore();
  return store.list();
}

export async function loadRecord(id: string): Promise<VehicleRecord | null> {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return null;
  const store = await getInventoryStore();
  return store.getById(id);
}

export function dealerPhotos(record: VehicleRecord): VehicleImage[] {
  return record.media.filter((item): item is VehicleImage => item.kind === "image" && item.provenance === "dealer");
}

export function coverFor(record: VehicleRecord): VehicleImage | undefined {
  const photos = dealerPhotos(record);
  return photos.find((photo) => photo.id === record.coverImageId) ?? photos.find((photo) => photo.category === "exterior") ?? photos[0];
}

export interface VehicleSummary {
  record: VehicleRecord;
  live: boolean;
  issues: number;
  photos: number;
  exterior: number;
  interior: number;
  hasVideo: boolean;
  cover?: VehicleImage;
  name: string;
}

export function summarise(record: VehicleRecord): VehicleSummary {
  const photos = dealerPhotos(record);
  return {
    record,
    live: isPubliclyVisible(record),
    issues: publicationIssues(record).length,
    photos: photos.length,
    exterior: photos.filter((photo) => photo.category === "exterior").length,
    interior: photos.filter((photo) => photo.category === "interior").length,
    hasVideo: record.media.some((item) => item.kind === "video" && item.provenance === "dealer"),
    cover: coverFor(record),
    name: [record.year, record.title || [record.make, record.model].filter(Boolean).join(" ")].filter(Boolean).join(" ") || "Untitled car",
  };
}

export { LISTING_PHOTO_TARGET };
