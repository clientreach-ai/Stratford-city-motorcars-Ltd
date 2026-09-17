/**
 * Form option lists and the shared result type.
 *
 * Deliberately kept free of any Zod import. The form components are client
 * components and need these values at runtime; if they lived alongside the
 * schemas, importing one option list would pull the whole validation library
 * into the browser bundle for no benefit. Validation stays on the server.
 */

/** What a vehicle enquiry is for. Viewings and test drives are requests the dealership confirms. */
export const REQUEST_TYPES = [
  { value: "question", label: "Ask a question" },
  { value: "viewing", label: "Request a viewing" },
  { value: "test-drive", label: "Request a test drive" },
] as const;
export type RequestType = (typeof REQUEST_TYPES)[number]["value"];

/** Preferred time for a viewing, within the confirmed hours model. */
export const PREFERRED_TIMES = [
  "Weekday, 12pm–2pm",
  "Weekday, 2pm–5pm",
  "Weekend, by appointment",
  "Outside opening hours",
  "Any time — call me to arrange",
] as const;

export const VEHICLE_CONDITIONS = ["Excellent", "Good", "Average", "Below average"] as const;

export const SERVICE_HISTORY_OPTIONS = [
  "Full service history",
  "Partial service history",
  "No service history",
  "Not sure",
] as const;

export const MOT_STATUSES = ["Current MOT", "MOT due within 3 months", "No current MOT", "Not sure"] as const;

export const KEY_COUNTS = ["1", "2", "3 or more"] as const;

export const ENQUIRY_TYPES = ["Buying a car", "Finance", "Part exchange", "Something else"] as const;

/** Shape returned by every form action, consumed by `useActionState`. */
export type FormState =
  | { status: "idle" }
  | { status: "success"; reference: string }
  | {
      status: "invalid";
      fieldErrors: Record<string, string[]>;
      values: Record<string, string>;
    }
  /** Validation passed but the enquiry could not be recorded or delivered — offer phone/WhatsApp. */
  | {
      status: "unavailable";
      message: string;
      values: Record<string, string>;
    };
