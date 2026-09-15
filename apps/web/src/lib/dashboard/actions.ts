"use server";

import { randomBytes } from "node:crypto";

import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { ZodError } from "zod";

import { LEAD_STATUSES, setLeadStatus, type LeadStatus } from "@/lib/leads/store";
import { INVENTORY_CACHE_TAG } from "@/lib/inventory/repository";
import { parseVehicleRecord } from "@/lib/inventory/schema";
import { getInventoryStore, SlugConflictError, StoreNotWritableError } from "@/lib/inventory/store";
import type { VehicleMedia, VehicleRecord, VehicleSpin, VehicleVideo } from "@/lib/inventory/types";
import { listingRecommendations, publicationIssues, type ListingRecommendation, type PublicationIssue } from "@/lib/inventory/visibility";
import { getMediaStorage } from "@/lib/media/storage";
import { generateMediaId } from "@/lib/media/process";
import { requireStaff } from "@/lib/server/staff";

import { FIELD_LABELS, fromEditorValues, type EditorValues } from "./editor-values";

/**
 * Dashboard mutations. Every action starts with `requireStaff()`: server
 * actions are reachable by anyone who can send a POST, so the check lives
 * here, not in the UI.
 */

export type ActionResult =
  | {
      ok: true;
      record: VehicleRecord;
      issues: PublicationIssue[];
      recommendations: ListingRecommendation[];
      message?: string;
    }
  | {
      ok: false;
      message: string;
      fieldErrors?: Record<string, string>;
      issues?: PublicationIssue[];
      conflict?: boolean;
    };

function newId(prefix = ""): string {
  return `${prefix}${randomBytes(6).toString("base64url").replace(/[^A-Za-z0-9]/g, "x")}`;
}

async function writableStore() {
  const store = await getInventoryStore();
  if (!store.writable) throw new StoreNotWritableError();
  return store;
}

function refreshPublicSite() {
  // Expire immediately: the dealership expects the website to show a change
  // as soon as they make it.
  revalidateTag(INVENTORY_CACHE_TAG, { expire: 0 });
}

function success(record: VehicleRecord, message?: string): ActionResult {
  return {
    ok: true,
    record,
    issues: publicationIssues(record),
    recommendations: listingRecommendations(record),
    message,
  };
}

function failure(error: unknown): ActionResult {
  if (error instanceof StoreNotWritableError || error instanceof SlugConflictError) {
    return { ok: false, message: error.message, fieldErrors: error instanceof SlugConflictError ? { slug: error.message } : undefined };
  }
  if (isZodError(error)) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of error.issues) {
      const path = issue.path.join(".");
      if (fieldErrors[path]) continue;
      fieldErrors[path] = explain(path, issue.code, issue.message);
    }
    return { ok: false, message: "Some details need checking before this can be saved.", fieldErrors };
  }
  console.error("[dashboard] action failed:", error instanceof Error ? `${error.name}: ${error.message}` : error);
  return { ok: false, message: "Something went wrong saving that. Please try again." };
}

function isZodError(error: unknown): error is ZodError {
  return !!error && typeof error === "object" && "issues" in error && Array.isArray((error as ZodError).issues);
}

function explain(path: string, code: string, raw: string): string {
  const base = path.replace(/\.\d+\./, ".").replace(/\.\d+$/, "");
  const label = FIELD_LABELS[path] ?? FIELD_LABELS[base] ?? "This field";
  if (path === "slug") return "Use lowercase letters, numbers and hyphens only, e.g. 2019-aston-martin-vantage.";
  if (path.startsWith("motHistory")) return "Each MOT entry needs a date, a result and a whole-number mileage.";
  if (code === "invalid_type") return `${label} must be a number.`;
  if (code === "too_big") return `${label} is too long or too large.`;
  if (code === "too_small") return `${label} is too short or too small.`;
  if (code === "invalid_format") return `${label} isn't in the expected format.`;
  return `${label}: ${raw}`;
}

async function loadForChange(id: string) {
  const store = await writableStore();
  const record = await store.getById(id);
  if (!record) throw new Error("Vehicle not found");
  return { store, record };
}

// ---- Create and duplicate -------------------------------------------------------

export async function createVehicle(): Promise<void> {
  await requireStaff();
  let id: string;
  try {
    const store = await writableStore();
    const now = new Date().toISOString();
    id = newId("car_");
    const record: VehicleRecord = parseVehicleRecord({
      id,
      slug: `new-car-${id.slice(4).toLowerCase().replace(/[^a-z0-9]/g, "")}`,
      previousSlugs: [],
      status: "draft",
      reserved: false,
      featured: false,
      title: "",
      make: "",
      model: "",
      year: null,
      price: null,
      priceOnApplication: false,
      mileage: null,
      fuel: null,
      transmission: null,
      bodyType: null,
      colour: "",
      motHistory: [],
      hpiStatus: "unknown",
      warranty: { available: null },
      ulezCompliant: null,
      description: "",
      features: [],
      media: [],
      createdAt: now,
      updatedAt: now,
    });
    await store.save(record);
  } catch (error) {
    const result = failure(error);
    redirect(`/dashboard/inventory?error=${encodeURIComponent(result.ok ? "" : result.message)}`);
  }
  redirect(`/dashboard/inventory/${id}`);
}

export async function duplicateVehicle(id: string): Promise<void> {
  await requireStaff();
  let copyId: string;
  try {
    const { store, record } = await loadForChange(id);
    const all = await store.list();
    const taken = new Set(all.flatMap((vehicle) => [vehicle.slug, ...vehicle.previousSlugs]));
    let slug = `${record.slug}-copy`.slice(0, 110);
    for (let n = 2; taken.has(slug); n += 1) slug = `${record.slug}-copy-${n}`.slice(0, 118);
    const now = new Date().toISOString();
    copyId = newId("car_");
    // Photographs, videos and history belong to the original car, never a copy.
    const copy = parseVehicleRecord({
      ...record,
      id: copyId,
      slug,
      previousSlugs: [],
      status: "draft",
      reserved: false,
      featured: false,
      title: record.title ? `${record.title} (copy)` : "",
      registration: undefined,
      registrationDate: undefined,
      motExpiry: undefined,
      motHistory: [],
      documentation: undefined,
      hpiStatus: "unknown",
      media: [],
      coverImageId: undefined,
      createdAt: now,
      updatedAt: now,
      listedAt: undefined,
      soldAt: undefined,
    });
    await store.save(copy);
  } catch (error) {
    const result = failure(error);
    redirect(`/dashboard/inventory?error=${encodeURIComponent(result.ok ? "" : result.message)}`);
  }
  redirect(`/dashboard/inventory/${copyId}?duplicated=1`);
}

// ---- Save ------------------------------------------------------------------------------

export async function saveVehicle(id: string, expectedUpdatedAt: string, values: EditorValues): Promise<ActionResult> {
  await requireStaff();
  try {
    const { store, record } = await loadForChange(id);
    if (record.updatedAt !== expectedUpdatedAt) {
      return {
        ok: false,
        conflict: true,
        message: "This car was changed somewhere else since you opened it. Reload the page to see the latest version.",
      };
    }

    const edits = fromEditorValues(values);
    const previousSlugs = [...record.previousSlugs];
    // Once a car has been on the website, its old address keeps working.
    if (edits.slug !== record.slug && record.listedAt && !previousSlugs.includes(record.slug)) {
      previousSlugs.push(record.slug);
    }

    const next = parseVehicleRecord({
      ...record,
      ...edits,
      previousSlugs: previousSlugs.filter((slug) => slug !== edits.slug),
      reserved: record.status === "published" ? edits.reserved : false,
      updatedAt: new Date().toISOString(),
    });

    const clash = (await store.list()).find(
      (vehicle) => vehicle.id !== next.id && (vehicle.slug === next.slug || vehicle.previousSlugs.includes(next.slug)),
    );
    if (clash) throw new SlugConflictError(next.slug);

    await store.save(next);
    refreshPublicSite();
    return success(next, "Saved.");
  } catch (error) {
    return failure(error);
  }
}

// ---- Lifecycle ---------------------------------------------------------------------------

async function change(
  id: string,
  mutate: (record: VehicleRecord) => VehicleRecord | ActionResult,
  message: string,
): Promise<ActionResult> {
  await requireStaff();
  try {
    const { store, record } = await loadForChange(id);
    const result = mutate(record);
    if ("ok" in result) return result;
    const next = parseVehicleRecord({ ...result, updatedAt: new Date().toISOString() });
    await store.save(next);
    refreshPublicSite();
    return success(next, message);
  } catch (error) {
    return failure(error);
  }
}

export async function publishVehicle(id: string): Promise<ActionResult> {
  return change(
    id,
    (record) => {
      const issues = publicationIssues(record);
      if (issues.length) {
        return {
          ok: false,
          issues,
          message: `This car can't go on the website yet — ${issues.length} thing${issues.length === 1 ? " needs" : "s need"} sorting first.`,
        };
      }
      return {
        ...record,
        status: "published",
        listedAt: record.listedAt ?? new Date().toISOString(),
        soldAt: undefined,
      };
    },
    "Published. The car is now on the website.",
  );
}

export async function unpublishVehicle(id: string): Promise<ActionResult> {
  return change(id, (record) => ({ ...record, status: "draft", reserved: false }), "Moved back to draft. The car is no longer on the website.");
}

export async function markVehicleSold(id: string): Promise<ActionResult> {
  return change(
    id,
    (record) => ({ ...record, status: "sold", reserved: false, featured: false, soldAt: new Date().toISOString() }),
    "Marked as sold. Its page stays up, marked SOLD, and it has left the stock list.",
  );
}

export async function archiveVehicle(id: string): Promise<ActionResult> {
  return change(
    id,
    (record) => ({ ...record, status: "archived", reserved: false, featured: false }),
    "Archived. The car is hidden from the website.",
  );
}

export async function restoreVehicle(id: string): Promise<ActionResult> {
  return change(id, (record) => ({ ...record, status: "draft" }), "Restored as a draft.");
}

export async function setVehicleFeatured(id: string, featured: boolean): Promise<ActionResult> {
  return change(
    id,
    (record) => {
      if (featured && record.status === "sold") {
        return { ok: false, message: "A sold car can't be featured on the homepage." };
      }
      return { ...record, featured };
    },
    featured
      ? "Featured. It shows on the homepage while it's published."
      : "No longer featured on the homepage.",
  );
}

export async function setVehicleReserved(id: string, reserved: boolean): Promise<ActionResult> {
  return change(
    id,
    (record) => {
      if (reserved && record.status !== "published") {
        return { ok: false, message: "Only a published car can be marked as reserved." };
      }
      return { ...record, reserved };
    },
    reserved ? "Marked as reserved." : "No longer reserved.",
  );
}

/** Form-friendly wrappers for list-page buttons (no return value needed). */
export async function listAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const intent = String(formData.get("intent") ?? "");
  const actions: Record<string, () => Promise<ActionResult>> = {
    publish: () => publishVehicle(id),
    unpublish: () => unpublishVehicle(id),
    sold: () => markVehicleSold(id),
    archive: () => archiveVehicle(id),
    restore: () => restoreVehicle(id),
    feature: () => setVehicleFeatured(id, true),
    unfeature: () => setVehicleFeatured(id, false),
  };
  if (intent === "duplicate") return duplicateVehicle(id);
  const run = actions[intent];
  if (!run) return;
  const result = await run();
  if (!result.ok) {
    // Publishing from the list can fail on missing details: send the dealership
    // to the car, where every reason is listed.
    redirect(
      result.issues?.length
        ? `/dashboard/inventory/${id}?publish=blocked`
        : `/dashboard/inventory?error=${encodeURIComponent(result.message)}`,
    );
  }
  redirect(`/dashboard/inventory?done=${encodeURIComponent(result.message ?? "Done.")}`);
}

// ---- Media ---------------------------------------------------------------------------------

export interface MediaChanges {
  /** Every remaining media id, in display order. */
  order: string[];
  updates: { id: string; category?: "exterior" | "interior" | "detail" | "documents"; alt?: string; title?: string }[];
  coverImageId?: string | null;
  removed: string[];
}

/**
 * Applies classification, alt text, order, cover and removals. Only media
 * already on the record can be referenced: new files arrive through the upload
 * route and links through the add-link actions, so a crafted request cannot
 * attach an arbitrary URL.
 */
export async function updateVehicleMedia(id: string, changes: MediaChanges): Promise<ActionResult> {
  await requireStaff();
  try {
    const { store, record } = await loadForChange(id);
    const removed = new Set(changes.removed);
    const byId = new Map(record.media.map((item) => [item.id, item]));

    const kept: VehicleMedia[] = [];
    for (const mediaId of changes.order) {
      const item = byId.get(mediaId);
      if (!item || removed.has(mediaId)) continue;
      const update = changes.updates.find((entry) => entry.id === mediaId);
      if (item.kind === "image") {
        kept.push({
          ...item,
          category: update?.category ?? item.category,
          alt: update?.alt !== undefined ? update.alt.slice(0, 250) : item.alt,
        });
      } else {
        kept.push({ ...item, title: update?.title !== undefined ? update.title.slice(0, 160) : item.title });
      }
    }
    // Anything not mentioned in `order` (e.g. uploaded in another tab) is kept at the end.
    for (const item of record.media) {
      if (!removed.has(item.id) && !kept.some((entry) => entry.id === item.id)) kept.push(item);
    }

    const cover =
      changes.coverImageId === null
        ? undefined
        : (changes.coverImageId ?? record.coverImageId);
    const next = parseVehicleRecord({
      ...record,
      media: kept,
      coverImageId: kept.some((item) => item.id === cover && item.kind === "image" && item.provenance === "dealer")
        ? cover
        : undefined,
      updatedAt: new Date().toISOString(),
    });
    await store.save(next);

    // Delete files that are no longer referenced by this record.
    const storage = getMediaStorage();
    for (const mediaId of removed) {
      const item = byId.get(mediaId);
      if (!item) continue;
      const sources =
        item.kind === "image" ? [item.src] : item.kind === "video" && item.source.type === "file" ? [item.source.src] : [];
      for (const src of sources) await storage.remove(src).catch(() => undefined);
    }

    refreshPublicSite();
    return success(next, "Media updated.");
  } catch (error) {
    return failure(error);
  }
}

/** Parses a YouTube or Vimeo link into a video source, or null. */
function parseVideoLink(raw: string): VehicleVideo["source"] | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^www\.|^m\./, "");
  const youtubeId =
    host === "youtu.be"
      ? url.pathname.slice(1)
      : host === "youtube.com" || host === "youtube-nocookie.com"
        ? (url.searchParams.get("v") ?? url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/)?.[1] ?? "")
        : "";
  if (/^[A-Za-z0-9_-]{11}$/.test(youtubeId)) return { type: "youtube", videoId: youtubeId };
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const vimeoId = url.pathname.match(/(\d{6,12})/)?.[1];
    if (vimeoId) return { type: "vimeo", videoId: vimeoId };
  }
  return null;
}

export async function addVehicleVideoLink(id: string, link: string, title: string): Promise<ActionResult> {
  const source = parseVideoLink(link);
  if (!source) {
    await requireStaff();
    return { ok: false, message: "Paste a YouTube or Vimeo link, for example https://youtu.be/…", fieldErrors: { videoLink: "That doesn't look like a YouTube or Vimeo link." } };
  }
  return change(
    id,
    (record) => ({
      ...record,
      media: [
        ...record.media,
        { id: generateMediaId(), kind: "video", title: title.trim().slice(0, 160) || "Walkaround video", source, provenance: "dealer" },
      ],
    }),
    "Walkaround video added.",
  );
}

export async function addVehicleSpinLink(id: string, link: string, title: string): Promise<ActionResult> {
  let url: URL | null = null;
  try {
    url = new URL(link.trim());
  } catch {
    url = null;
  }
  if (!url || url.protocol !== "https:") {
    await requireStaff();
    return { ok: false, message: "Paste the full https link to the 360° spin.", fieldErrors: { spinLink: "Use a full link starting with https://" } };
  }
  const spin: VehicleSpin = {
    id: generateMediaId(),
    kind: "spin",
    title: title.trim().slice(0, 160) || "360° spin",
    url: url.toString(),
    provenance: "dealer",
  };
  return change(id, (record) => ({ ...record, media: [...record.media, spin] }), "360° spin link added.");
}

// ---- Enquiries --------------------------------------------------------------------------------

export async function updateLeadStatus(formData: FormData): Promise<void> {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as LeadStatus;
  if (!/^[0-9a-f-]{36}$/.test(id) || !(LEAD_STATUSES as readonly string[]).includes(status)) return;
  await setLeadStatus(id, status);
  redirect("/dashboard/enquiries");
}
