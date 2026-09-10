const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

const decimal = new Intl.NumberFormat("en-GB");

/** £40,000 — dealership prices are always whole pounds. */
export function formatPrice(value: number): string {
  return gbp.format(value);
}

/** 38,000 miles */
export function formatMileage(value: number): string {
  return `${decimal.format(value)} miles`;
}

/** Compact form for dense spec strips: 38,000 mi */
export function formatMileageShort(value: number): string {
  return `${decimal.format(value)} mi`;
}

export function formatNumber(value: number): string {
  return decimal.format(value);
}

/**
 * Warranty as the dealership words it. Zero months is not "no warranty" —
 * their AA cover is optional on older stock, so it reads as an option.
 */
export function formatWarranty(months: number): string {
  if (months <= 0) return "AA warranty options available";
  return months === 1 ? "1 month included" : `${months} months included`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

/** "Rolls-Royce Dawn" → "rolls-royce-dawn" */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
