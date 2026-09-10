/**
 * Form option lists and the shared result type.
 *
 * Deliberately kept free of any Zod import. The form components are client
 * components and need these values at runtime; if they lived alongside the
 * schemas, importing one option list would pull the whole validation library
 * into the browser bundle (~80kB gzipped) for no benefit. Validation stays on
 * the server, where it belongs.
 */

export const EMPLOYMENT_STATUSES = [
  "Employed full-time",
  "Employed part-time",
  "Self-employed",
  "Retired",
  "Student",
  "Other",
] as const;

export const VEHICLE_CONDITIONS = [
  "Excellent",
  "Good",
  "Average",
  "Below average",
] as const;

export const SERVICE_HISTORY_OPTIONS = [
  "Full service history",
  "Partial service history",
  "No service history",
  "Not sure",
] as const;

export const ENQUIRY_TYPES = [
  "Buying a car",
  "Finance",
  "Part exchange",
  "Vehicle hire",
  "Something else",
] as const;

/** Shape returned by every form action, consumed by `useActionState`. */
export type FormState =
  | { status: "idle" }
  | { status: "success"; reference: string }
  | {
      status: "invalid";
      fieldErrors: Record<string, string[]>;
      values: Record<string, string>;
    }
  /** Validation passed but the lead could not be delivered — offer phone/WhatsApp. */
  | {
      status: "unavailable";
      message: string;
      values: Record<string, string>;
    };
