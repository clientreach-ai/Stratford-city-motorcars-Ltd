"use server";

import type { z } from "zod";

import { deliverLead } from "./leads";
import type { FormState } from "./options";
import {
  contactSchema,
  financeSchema,
  partExchangeSchema,
  vehicleEnquirySchema,
  type LeadInput,
} from "./schemas";

/** Everything the customer typed, so a rejected form re-renders filled in. */
function readValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && key !== "website") values[key] = value;
  }
  return values;
}

const UNAVAILABLE_MESSAGE =
  "We couldn't send your enquiry just now. Please call or message us on WhatsApp and we'll pick it up straight away.";

/**
 * One pipeline for every form: parse → validate → deliver. Keeping it in a
 * single place means all four forms behave identically on failure, which is
 * what makes the error states trustworthy.
 */
async function submit<Schema extends z.ZodType<LeadInput>>(
  schema: Schema,
  formData: FormData,
  defaults: Record<string, unknown> = {},
): Promise<FormState> {
  const values = readValues(formData);
  const raw = { ...Object.fromEntries(formData.entries()), ...defaults };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    return {
      status: "invalid",
      fieldErrors: flattened.fieldErrors as Record<string, string[]>,
      values,
    };
  }

  const result = await deliverLead(parsed.data);
  if (!result.delivered) {
    return { status: "unavailable", message: UNAVAILABLE_MESSAGE, values };
  }

  return { status: "success", reference: result.reference };
}

export async function submitVehicleEnquiry(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return submit(vehicleEnquirySchema, formData, {
    kind: "vehicle-enquiry",
    interestedInFinance: formData.get("interestedInFinance") === "on",
    hasPartExchange: formData.get("hasPartExchange") === "on",
  });
}

export async function submitFinanceEnquiry(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return submit(financeSchema, formData, {
    kind: "finance",
    hasPartExchange: formData.get("hasPartExchange") === "on",
  });
}

export async function submitPartExchange(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return submit(partExchangeSchema, formData, {
    kind: "part-exchange",
    outstandingFinance: formData.get("outstandingFinance") === "on",
  });
}

export async function submitContact(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return submit(contactSchema, formData, { kind: "contact" });
}
