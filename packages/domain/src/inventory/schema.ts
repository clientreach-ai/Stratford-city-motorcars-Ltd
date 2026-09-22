import { z } from "zod";

import {
  BODY_TYPES,
  FUEL_TYPES,
  HPI_STATUSES,
  PHOTO_CATEGORIES,
  PHOTO_VARIANT_FORMATS,
  TRANSMISSIONS,
  VEHICLE_STATUSES,
  type VehicleRecord,
} from "@Stratford-city-motorcars-Ltd/core/vehicle";

/**
 * Structural validation for stored vehicle records.
 *
 * This checks shape, types and sane bounds, so a malformed document can never
 * reach a page. It deliberately does NOT enforce completeness: a draft may be
 * missing its price or photographs. Whether a record may be published is
 * decided by `publicationIssues()` in `visibility.ts`.
 *
 * Server code and scripts only — never import this from a client component, or
 * Zod ends up in the browser bundle.
 */

const trimmed = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD");
const isoDateTime = z.string().datetime({ offset: true });
const money = z.number().int().min(0).max(100_000_000);
const optionalInt = (min: number, max: number) => z.number().int().min(min).max(max).optional();
const mediaId = z.string().min(1).max(80).regex(/^[A-Za-z0-9_-]+$/);

/** Local media paths or https URLs only — never `javascript:` or protocol-relative. */
const mediaSrc = z
  .string()
  .max(500)
  .refine((value) => /^\/(?!\/)[A-Za-z0-9._~\-/%]+$/.test(value) || /^https:\/\/[^\s]+$/.test(value), {
    message: "Media must be a site path or an https URL",
  });

const credit = z.object({
  author: trimmed(120),
  license: trimmed(60),
  licenseUrl: z.url().max(500),
  sourceUrl: z.url().max(500),
});

const provenance = z.enum(["dealer", "library"]);

const image = z.object({
  id: mediaId,
  kind: z.literal("image"),
  src: mediaSrc,
  width: z.number().int().min(1).max(20_000),
  height: z.number().int().min(1).max(20_000),
  alt: trimmed(250),
  category: z.enum(PHOTO_CATEGORIES),
  provenance,
  credit: credit.optional(),
  // Written by the API when the photograph is stored; see PhotoVariants.
  variants: z
    .object({
      widths: z.array(z.number().int().min(16).max(8_000)).min(1).max(16),
      formats: z.array(z.enum(PHOTO_VARIANT_FORMATS)).min(1).max(PHOTO_VARIANT_FORMATS.length),
      revision: z.number().int().min(1).max(999).optional(),
    })
    .optional(),
  placeholder: z
    .string()
    .max(4_000)
    .regex(/^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/, "Placeholder must be a small data: image")
    .optional(),
});

const videoSource = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("file"),
    src: mediaSrc,
    mimeType: z.enum(["video/mp4", "video/webm", "video/quicktime"]),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
  }),
  z.object({ type: z.literal("youtube"), videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/) }),
  z.object({ type: z.literal("vimeo"), videoId: z.string().regex(/^\d{6,12}$/) }),
]);

const video = z.object({
  id: mediaId,
  kind: z.literal("video"),
  title: trimmed(160),
  source: videoSource,
  poster: mediaSrc.optional(),
  durationSeconds: z.number().int().min(1).max(3600).optional(),
  provenance,
});

const spin = z.object({
  id: mediaId,
  kind: z.literal("spin"),
  title: trimmed(160),
  url: z.url().max(500).refine((value) => value.startsWith("https://"), "Use an https link"),
  provenance,
});

const financeExample = z.object({
  product: z.enum(["HP", "PCP"]),
  lender: trimmed(120).min(1),
  monthlyPayment: z.number().positive().max(1_000_000),
  termMonths: z.number().int().min(1).max(120),
  deposit: z.number().min(0).max(100_000_000),
  apr: z.number().min(0).max(100),
  fixedRate: z.number().min(0).max(100),
  totalCredit: z.number().min(0).max(100_000_000),
  totalAmountPayable: z.number().min(0).max(100_000_000),
  optionalFinalPayment: z.number().min(0).max(100_000_000).optional(),
});

export const vehicleRecordSchema = z.object({
  id: z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  previousSlugs: z.array(z.string().min(1).max(160)).max(50),

  status: z.enum(VEHICLE_STATUSES),
  reserved: z.boolean(),
  featured: z.boolean(),

  title: trimmed(160),
  make: trimmed(60),
  model: trimmed(80),
  variant: optionalText(120),
  year: z.number().int().min(1886).max(2100).nullable(),
  registration: optionalText(12),
  registrationDate: isoDate.optional(),

  price: money.nullable(),
  priceOnApplication: z.boolean(),
  adminFee: money.optional(),
  financeExample: financeExample.optional(),

  mileage: z.number().int().min(0).max(2_000_000).nullable(),
  fuel: z.enum(FUEL_TYPES).nullable(),
  transmission: z.enum(TRANSMISSIONS).nullable(),
  bodyType: z.enum(BODY_TYPES).nullable(),
  colour: trimmed(80),
  engine: optionalText(80),
  engineSizeCc: optionalInt(50, 20_000),
  power: optionalText(40),
  doors: optionalInt(1, 9),
  seats: optionalInt(1, 12),
  interior: optionalText(160),
  previousOwners: optionalInt(0, 99),
  insuranceGroup: optionalText(10),
  roadTaxBand: optionalText(40),

  serviceHistory: optionalText(200),
  motExpiry: isoDate.optional(),
  motHistory: z
    .array(
      z.object({
        date: isoDate,
        result: z.enum(["pass", "fail"]),
        mileage: optionalInt(0, 2_000_000),
        notes: optionalText(1000),
      }),
    )
    .max(60),
  documentation: optionalText(300),
  hpiStatus: z.enum(HPI_STATUSES),
  warranty: z.object({
    available: z.boolean().nullable(),
    termMonths: optionalInt(1, 120),
    notes: optionalText(300),
  }),
  ulezCompliant: z.boolean().nullable(),

  description: trimmed(6000),
  features: z.array(trimmed(80).min(1)).max(60),

  media: z.array(z.discriminatedUnion("kind", [image, video, spin])).max(120),
  coverImageId: mediaId.optional(),

  seoTitle: optionalText(70),
  seoDescription: optionalText(170),

  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  listedAt: isoDateTime.optional(),
  soldAt: isoDateTime.optional(),
});

/** Parses a stored or submitted record. Throws with field paths on failure. */
export function parseVehicleRecord(value: unknown): VehicleRecord {
  return vehicleRecordSchema.parse(value) as VehicleRecord;
}

// Compile-time guard: the schema's output must stay assignable to the domain type.
type SchemaOutput = z.output<typeof vehicleRecordSchema>;
const _assignable: (value: SchemaOutput) => VehicleRecord = (value) => value;
void _assignable;
