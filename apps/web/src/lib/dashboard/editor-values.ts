import type {
  BodyType,
  FuelType,
  HpiStatus,
  MotTestRecord,
  RepresentativeFinanceExample,
  Transmission,
  VehicleRecord,
} from "@/lib/inventory/types";

/**
 * The vehicle editor's form state.
 *
 * Every input is held as the string the dealership typed (or a boolean), so a
 * half-entered number never becomes `NaN` in state. `fromEditorValues()` turns
 * it into the editable part of a record; the server validates the result with
 * the record schema before saving. Media, lifecycle status and featured are
 * changed through their own actions, not this form.
 *
 * Shared by the client editor and the server actions — no server-only imports.
 */

export interface MotRowValues {
  date: string;
  result: "pass" | "fail";
  mileage: string;
  notes: string;
}

export interface EditorValues {
  slug: string;
  title: string;
  make: string;
  model: string;
  variant: string;
  year: string;
  registration: string;
  registrationDate: string;

  price: string;
  priceOnApplication: boolean;
  adminFee: string;
  reserved: boolean;

  finance: {
    product: "" | "HP" | "PCP";
    lender: string;
    monthlyPayment: string;
    termMonths: string;
    deposit: string;
    apr: string;
    fixedRate: string;
    totalCredit: string;
    totalAmountPayable: string;
    optionalFinalPayment: string;
  };

  mileage: string;
  fuel: "" | FuelType;
  transmission: "" | Transmission;
  bodyType: "" | BodyType;
  colour: string;
  engine: string;
  engineSizeCc: string;
  power: string;
  doors: string;
  seats: string;
  interior: string;
  previousOwners: string;
  insuranceGroup: string;
  roadTaxBand: string;

  serviceHistory: string;
  motExpiry: string;
  motHistory: MotRowValues[];
  documentation: string;
  hpiStatus: HpiStatus;
  warrantyAvailable: "unknown" | "yes" | "no";
  warrantyTermMonths: string;
  warrantyNotes: string;
  ulez: "unknown" | "yes" | "no";

  description: string;
  features: string;

  seoTitle: string;
  seoDescription: string;
}

/** The record fields this form owns. */
export type EditableRecordFields = Pick<
  VehicleRecord,
  | "slug"
  | "title"
  | "make"
  | "model"
  | "variant"
  | "year"
  | "registration"
  | "registrationDate"
  | "price"
  | "priceOnApplication"
  | "adminFee"
  | "reserved"
  | "financeExample"
  | "mileage"
  | "fuel"
  | "transmission"
  | "bodyType"
  | "colour"
  | "engine"
  | "engineSizeCc"
  | "power"
  | "doors"
  | "seats"
  | "interior"
  | "previousOwners"
  | "insuranceGroup"
  | "roadTaxBand"
  | "serviceHistory"
  | "motExpiry"
  | "motHistory"
  | "documentation"
  | "hpiStatus"
  | "warranty"
  | "ulezCompliant"
  | "description"
  | "features"
  | "seoTitle"
  | "seoDescription"
>;

const text = (value: string | number | undefined | null) => (value === undefined || value === null ? "" : String(value));

export function toEditorValues(record: VehicleRecord): EditorValues {
  const finance = record.financeExample;
  return {
    slug: record.slug,
    title: record.title,
    make: record.make,
    model: record.model,
    variant: text(record.variant),
    year: text(record.year),
    registration: text(record.registration),
    registrationDate: text(record.registrationDate),

    price: text(record.price),
    priceOnApplication: record.priceOnApplication,
    adminFee: text(record.adminFee),
    reserved: record.reserved,

    finance: {
      product: finance?.product ?? "",
      lender: text(finance?.lender),
      monthlyPayment: text(finance?.monthlyPayment),
      termMonths: text(finance?.termMonths),
      deposit: text(finance?.deposit),
      apr: text(finance?.apr),
      fixedRate: text(finance?.fixedRate),
      totalCredit: text(finance?.totalCredit),
      totalAmountPayable: text(finance?.totalAmountPayable),
      optionalFinalPayment: text(finance?.optionalFinalPayment),
    },

    mileage: text(record.mileage),
    fuel: record.fuel ?? "",
    transmission: record.transmission ?? "",
    bodyType: record.bodyType ?? "",
    colour: record.colour,
    engine: text(record.engine),
    engineSizeCc: text(record.engineSizeCc),
    power: text(record.power),
    doors: text(record.doors),
    seats: text(record.seats),
    interior: text(record.interior),
    previousOwners: text(record.previousOwners),
    insuranceGroup: text(record.insuranceGroup),
    roadTaxBand: text(record.roadTaxBand),

    serviceHistory: text(record.serviceHistory),
    motExpiry: text(record.motExpiry),
    motHistory: record.motHistory.map((row) => ({
      date: row.date,
      result: row.result,
      mileage: text(row.mileage),
      notes: text(row.notes),
    })),
    documentation: text(record.documentation),
    hpiStatus: record.hpiStatus,
    warrantyAvailable: record.warranty.available === null ? "unknown" : record.warranty.available ? "yes" : "no",
    warrantyTermMonths: text(record.warranty.termMonths),
    warrantyNotes: text(record.warranty.notes),
    ulez: record.ulezCompliant === null ? "unknown" : record.ulezCompliant ? "yes" : "no",

    description: record.description,
    features: record.features.join("\n"),

    seoTitle: text(record.seoTitle),
    seoDescription: text(record.seoDescription),
  };
}

/** "" → undefined; otherwise a number (NaN is left for the schema to reject). */
function num(value: string): number | undefined {
  const trimmed = value.replace(/[£,\s]/g, "");
  return trimmed === "" ? undefined : Number(trimmed);
}

const opt = (value: string) => (value.trim() === "" ? undefined : value.trim());

export function fromEditorValues(values: EditorValues): EditableRecordFields {
  const f = values.finance;
  const financeFilled = Object.values(f).some((value) => value.trim() !== "");
  const financeExample = financeFilled
    ? ({
        product: f.product || undefined,
        lender: f.lender.trim(),
        monthlyPayment: num(f.monthlyPayment),
        termMonths: num(f.termMonths),
        deposit: num(f.deposit),
        apr: num(f.apr),
        fixedRate: num(f.fixedRate),
        totalCredit: num(f.totalCredit),
        totalAmountPayable: num(f.totalAmountPayable),
        optionalFinalPayment: num(f.optionalFinalPayment),
      } as unknown as RepresentativeFinanceExample)
    : undefined;

  return {
    slug: values.slug.trim(),
    title: values.title.trim(),
    make: values.make.trim(),
    model: values.model.trim(),
    variant: opt(values.variant),
    year: num(values.year) ?? null,
    registration: opt(values.registration)?.toUpperCase(),
    registrationDate: opt(values.registrationDate),

    price: values.priceOnApplication ? null : (num(values.price) ?? null),
    priceOnApplication: values.priceOnApplication,
    adminFee: num(values.adminFee),
    reserved: values.reserved,
    financeExample,

    mileage: num(values.mileage) ?? null,
    fuel: values.fuel || null,
    transmission: values.transmission || null,
    bodyType: values.bodyType || null,
    colour: values.colour.trim(),
    engine: opt(values.engine),
    engineSizeCc: num(values.engineSizeCc),
    power: opt(values.power),
    doors: num(values.doors),
    seats: num(values.seats),
    interior: opt(values.interior),
    previousOwners: num(values.previousOwners),
    insuranceGroup: opt(values.insuranceGroup),
    roadTaxBand: opt(values.roadTaxBand),

    serviceHistory: opt(values.serviceHistory),
    motExpiry: opt(values.motExpiry),
    motHistory: values.motHistory
      .filter((row) => row.date.trim() !== "")
      .map(
        (row): MotTestRecord => ({
          date: row.date,
          result: row.result,
          mileage: num(row.mileage),
          notes: opt(row.notes),
        }),
      ),
    documentation: opt(values.documentation),
    hpiStatus: values.hpiStatus,
    warranty: {
      available: values.warrantyAvailable === "unknown" ? null : values.warrantyAvailable === "yes",
      termMonths: num(values.warrantyTermMonths),
      notes: opt(values.warrantyNotes),
    },
    ulezCompliant: values.ulez === "unknown" ? null : values.ulez === "yes",

    description: values.description.trim(),
    features: values.features
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),

    seoTitle: opt(values.seoTitle),
    seoDescription: opt(values.seoDescription),
  };
}

/** "2019 Aston Martin Vantage V8" → "2019-aston-martin-vantage-v8" */
export function suggestSlug(parts: { year: string; make: string; model: string; variant?: string }): string {
  return [parts.year, parts.make, parts.model, parts.variant]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

/** Plain-English names for form paths, used to explain validation errors. */
export const FIELD_LABELS: Record<string, string> = {
  slug: "Web address",
  title: "Listing title",
  make: "Make",
  model: "Model",
  variant: "Variant",
  year: "Year",
  registration: "Registration",
  registrationDate: "First registered",
  price: "Cash price",
  adminFee: "Admin fee",
  mileage: "Mileage",
  colour: "Colour",
  engine: "Engine",
  engineSizeCc: "Engine size",
  power: "Power",
  doors: "Doors",
  seats: "Seats",
  interior: "Interior",
  previousOwners: "Previous owners",
  insuranceGroup: "Insurance group",
  roadTaxBand: "Road tax band",
  serviceHistory: "Service history",
  motExpiry: "MOT expiry",
  motHistory: "MOT history",
  documentation: "V5C and documents",
  "warranty.termMonths": "Warranty term",
  "warranty.notes": "Warranty notes",
  description: "Description",
  features: "Key features",
  seoTitle: "Search title",
  seoDescription: "Search description",
  "financeExample.product": "Finance product",
  "financeExample.lender": "Lender",
  "financeExample.monthlyPayment": "Monthly payment",
  "financeExample.termMonths": "Term",
  "financeExample.deposit": "Deposit",
  "financeExample.apr": "Representative APR",
  "financeExample.fixedRate": "Fixed rate",
  "financeExample.totalCredit": "Total credit",
  "financeExample.totalAmountPayable": "Total amount payable",
  "financeExample.optionalFinalPayment": "Optional final payment",
};
