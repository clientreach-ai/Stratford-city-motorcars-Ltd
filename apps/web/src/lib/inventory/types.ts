/**
 * The vehicle domain model.
 *
 * Deliberately close to what a dealer management system actually returns, so
 * swapping the static source for a database or a feed is a change of one
 * module (`repository.ts`) rather than a change across the UI.
 *
 * Every specification field is optional. The UI renders a row only when the
 * value exists — a vehicle whose engine size we do not know shows no engine
 * row rather than a guess.
 */

export type FuelType = "Petrol" | "Diesel" | "Hybrid" | "Plug-in Hybrid" | "Electric";

export type Transmission = "Automatic" | "Manual" | "Semi-Automatic";

export type BodyType =
  | "Saloon"
  | "Estate"
  | "SUV"
  | "Convertible"
  | "Coupe"
  | "Hatchback"
  | "MPV";

/** Where a photograph came from. Drives captions and credit lines. */
export type PhotoProvenance =
  /** Photographed by the dealership — the only kind that shows the actual car. */
  | "dealer"
  /** A correctly-identified photograph of the same model, used as a stand-in. */
  | "library";

export interface ImageCredit {
  author: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
}

export interface VehicleImage {
  src: string;
  alt: string;
  width: number;
  height: number;
  provenance: PhotoProvenance;
  credit?: ImageCredit;
}

export type VehicleStatus = "available" | "reserved" | "sold";

export interface Vehicle {
  id: string;
  /** SEO-friendly URL segment, e.g. `mercedes-benz-sl63-amg-2016`. */
  slug: string;
  /** Listing headline exactly as the dealership words it. */
  title: string;

  make: string;
  model: string;
  year: number;
  /** Recorded mileage in miles. */
  mileage: number;
  /** Cash price in whole pounds sterling. */
  price: number;

  fuel: FuelType;
  transmission: Transmission;
  bodyType: BodyType;
  /** Exterior colour as the dealership describes it. */
  colour: string;

  // ---- Optional specification -------------------------------------------
  // Present only where the dealership has actually stated the value.
  registration?: string;
  engine?: string;
  power?: string;
  doors?: number;
  seats?: number;
  interior?: string;
  serviceHistory?: string;

  hpiClear: boolean;
  /** Months of warranty included. 0 means none stated; options are available. */
  warrantyMonths: number;

  /**
   * ULEZ status is never asserted from year and fuel alone — a car's Euro
   * rating is what counts and we do not hold it. `null` means "ask us", which
   * is what the vehicle page says.
   */
  ulezCompliant: boolean | null;

  description: string;
  features: string[];

  /** Photographs taken by the dealership. Empty until they supply them. */
  images: VehicleImage[];
  /** Model-accurate stand-ins shown while `images` is empty. */
  libraryImages: VehicleImage[];

  status: VehicleStatus;
  featured: boolean;
  /** ISO timestamp — drives "new arrival" badging and default sort. */
  listedAt: string;
}

/**
 * A vehicle with presentation-level fields resolved. The UI consumes this, so
 * no component needs to know how photography or badges are decided.
 */
export interface VehicleView extends Vehicle {
  /** Dealer photography when it exists, otherwise the library stand-ins. */
  displayImages: VehicleImage[];
  /** True when nothing at all is available and the placard should show. */
  awaitingPhotography: boolean;
  /** True when what is shown is a stand-in rather than this actual car. */
  showingLibraryImages: boolean;
  isNewArrival: boolean;
}

// ---- Search, filter and sort ---------------------------------------------

export const SORT_OPTIONS = [
  { value: "newest", label: "Latest arrivals" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "year-desc", label: "Year: newest first" },
  { value: "year-asc", label: "Year: oldest first" },
  { value: "mileage-asc", label: "Mileage: lowest first" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

export interface VehicleQuery {
  q?: string;
  make?: string[];
  model?: string[];
  fuel?: string[];
  transmission?: string[];
  bodyType?: string[];
  features?: string[];
  minPrice?: number;
  maxPrice?: number;
  maxMileage?: number;
  minYear?: number;
  maxYear?: number;
  sort?: SortOption;
}

export interface FacetValue {
  value: string;
  label: string;
  /** How many vehicles would remain if this value were selected. */
  count: number;
}

export interface VehicleFacets {
  make: FacetValue[];
  model: FacetValue[];
  fuel: FacetValue[];
  transmission: FacetValue[];
  bodyType: FacetValue[];
  features: FacetValue[];
  priceRange: { min: number; max: number };
  yearRange: { min: number; max: number };
  mileageRange: { min: number; max: number };
}
