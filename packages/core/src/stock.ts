import type { PhotoCategory, VehicleImage, VehicleRecord, VehicleStatus } from "./vehicle";
import {
  LISTING_PHOTO_TARGET,
  REQUIRED_DEALER_PHOTOS,
  isPubliclyVisible,
  listingRecommendations,
  publicBlockers,
  publicationIssues,
  resolveCover,
  type ListingRecommendation,
  type PublicationIssue,
} from "./visibility";

/**
 * Stock as the admin works with it.
 *
 * `AdminVehicle` is the website's `VehicleRecord` plus the dealership-only
 * facts that never reach the public site: who a car is reserved for, and what
 * it sold for. Keep these off `VehicleRecord` — `PublicVehicle` is derived
 * from it, and a sale price must never be able to leak into a public page.
 *
 * BACKEND NOTE: the website's `vehicleRecordSchema` strips unknown keys, so
 * `reservation` and `sale` need their own storage (columns or a sibling
 * document), not extra keys on `vehicle.record`.
 */

export interface Reservation {
  /** A customer record when the buyer is known to the system. */
  customerId: string | null;
  customerName: string;
  /** ISO. */
  reservedAt: string;
  /** Deposits are taken offline today; this records what was agreed. */
  depositNote?: string;
  note?: string;
}

export interface SaleRecord {
  /** ISO. Mirrors `VehicleRecord.soldAt`. */
  soldAt: string;
  /**
   * Whole pounds. Null when not recorded — and always null in responses to a
   * role without `stock.salePrice`; the API removes it, the admin does not.
   */
  salePrice: number | null;
  customerId: string | null;
  customerName: string | null;
  /** The enquiry that led to the sale, when there was one. */
  enquiryId: string | null;
}

export interface AdminVehicle extends VehicleRecord {
  reservation: Reservation | null;
  sale: SaleRecord | null;
  /** Enquiries about this car that are not closed. Computed by the API. */
  openEnquiryCount: number;
}

export const VEHICLE_STATUS_LABELS = [
  { value: "draft", label: "Draft", note: "Being prepared. Never on the website." },
  { value: "published", label: "For sale", note: "On the website, if every publishing rule is met." },
  { value: "sold", label: "Sold", note: "Page stays up marked SOLD; removed from listings." },
  { value: "archived", label: "Archived", note: "Withdrawn. Never on the website." },
] as const satisfies readonly { value: VehicleStatus; label: string; note: string }[];

export function vehicleStatusLabel(status: VehicleStatus): string {
  return VEHICLE_STATUS_LABELS.find((item) => item.value === status)?.label ?? status;
}

/** How close a listing is to publishable, and to the client's finished standard. */
export interface ListingProgress {
  dealerPhotos: number;
  byCategory: Record<PhotoCategory, number>;
  libraryItems: number;
  hasVideo: boolean;
  target: number;
  /** Everything stopping publication, whatever the status. */
  issues: PublicationIssue[];
  /** Everything keeping it off the site right now, including status. */
  blockers: PublicationIssue[];
  recommendations: ListingRecommendation[];
  /** On the public site at this moment. */
  live: boolean;
  /** Marked for sale but held back by a rule. */
  withheld: boolean;
  cover: VehicleImage | undefined;
}

export function listingProgress(record: VehicleRecord): ListingProgress {
  const dealer = record.media.filter(
    (item): item is VehicleImage => item.kind === "image" && item.provenance === "dealer",
  );
  const byCategory: Record<PhotoCategory, number> = { exterior: 0, interior: 0, detail: 0, documents: 0 };
  for (const image of dealer) byCategory[image.category] += 1;

  const live = isPubliclyVisible(record);
  return {
    dealerPhotos: dealer.length,
    byCategory,
    libraryItems: record.media.filter((item) => item.provenance === "library").length,
    hasVideo: record.media.some((item) => item.kind === "video" && item.provenance === "dealer"),
    target: LISTING_PHOTO_TARGET,
    issues: publicationIssues(record),
    blockers: publicBlockers(record),
    recommendations: listingRecommendations(record),
    live,
    withheld: (record.status === "published" || record.status === "sold") && !live,
    cover: resolveCover(dealer, record.coverImageId),
  };
}

export { REQUIRED_DEALER_PHOTOS };

// ---- Lifecycle -------------------------------------------------------------------

/**
 * Which status each lifecycle action may be taken from, and what to say when it
 * cannot. The API enforces these; the admin hides the actions and the sample
 * data applies the same rules, so all three agree.
 *
 * Without them a car can leave a status by the wrong door: "put back on sale"
 * on a draft would publish it without its photographs, and on an archived car
 * it would undo an archive that only the owner may undo.
 */
export const STOCK_ACTION_RULES = {
  publish: {
    from: ["draft"],
    refusal: {
      published: "This car is already on the website.",
      sold: "This car is marked sold. Use “Put back on sale” instead.",
      archived: "Restore this car before publishing it.",
    },
  },
  unpublish: {
    from: ["published"],
    refusal: {
      draft: "This car is not on the website.",
      sold: "This car is marked sold. Use “Put back on sale” first.",
      archived: "Restore this car before taking it off the website.",
    },
  },
  undoSale: {
    from: ["sold"],
    refusal: {
      draft: "This car is not marked sold.",
      published: "This car is already for sale.",
      archived: "Restore this car before putting it back on sale.",
    },
  },
  archive: {
    from: ["draft", "published", "sold"],
    refusal: { archived: "This car is already archived." },
  },
  restore: {
    from: ["archived"],
    refusal: {
      draft: "This car is not archived.",
      published: "This car is not archived.",
      sold: "This car is not archived.",
    },
  },
  edit: {
    from: ["draft", "published", "sold"],
    refusal: { archived: "Restore this car before editing it." },
  },
} as const satisfies Record<string, { from: readonly VehicleStatus[]; refusal: Partial<Record<VehicleStatus, string>> }>;

export type StockAction = keyof typeof STOCK_ACTION_RULES;

/** True when the action is allowed from the car's current status. */
export function canTakeStockAction(action: StockAction, status: VehicleStatus): boolean {
  return (STOCK_ACTION_RULES[action].from as readonly VehicleStatus[]).includes(status);
}

/** Why the action is refused, in words for the dealership. Undefined when allowed. */
export function stockActionRefusal(action: StockAction, status: VehicleStatus): string | undefined {
  if (canTakeStockAction(action, status)) return undefined;
  const refusal = STOCK_ACTION_RULES[action].refusal as Partial<Record<VehicleStatus, string>>;
  return refusal[status] ?? "This car cannot be changed that way right now.";
}

/**
 * Why this car cannot be deleted outright, in words for the dealership.
 * Undefined when it is safe to delete: a draft that never reached the website
 * and that nobody has enquired about. Everything else is archived instead, so
 * the dealership keeps its history.
 */
export function discardVehicleRefusal(
  record: Pick<VehicleRecord, "status" | "listedAt">,
  options: { hasEnquiries: boolean },
): string | undefined {
  if (record.status !== "draft") return "Only a draft can be deleted. Archive this car instead.";
  if (record.listedAt) return "This car has been on the website before. Archive it instead.";
  if (options.hasEnquiries) return "Someone has enquired about this car. Archive it instead.";
  return undefined;
}

/**
 * Where a restored car lands. A car archived while sold goes back to sold, so
 * its sale — and its sale price — survives being archived.
 */
export function statusAfterRestore(sold: boolean): VehicleStatus {
  return sold ? "sold" : "draft";
}

// ---- Queries and mutations -------------------------------------------------------

export const STOCK_SORTS = [
  { value: "updated", label: "Recently updated" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "year-desc", label: "Year: newest first" },
  { value: "title", label: "Name A–Z" },
] as const;

export type StockSort = (typeof STOCK_SORTS)[number]["value"];

/** What a save returns: the stored record and where it now stands. */
export interface SaveVehicleResult {
  vehicle: AdminVehicle;
  issues: PublicationIssue[];
  recommendations: ListingRecommendation[];
}

export interface ReserveInput {
  customerId: string | null;
  customerName: string;
  depositNote?: string;
  note?: string;
}

export interface MarkSoldInput {
  /** YYYY-MM-DD. */
  soldOn: string;
  salePrice: number | null;
  customerId: string | null;
  customerName: string | null;
  enquiryId: string | null;
}

/** Every write to a record carries the `updatedAt` it was read at. */
export interface Versioned {
  expectedUpdatedAt: string;
}
