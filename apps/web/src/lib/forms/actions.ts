"use server";

import { headers } from "next/headers";
import type { z } from "zod";

import { deliverLead } from "@/lib/leads/deliver";
import { allowSubmission } from "@/lib/leads/rate-limit";

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
    if (typeof value === "string" && key !== "website" && !key.startsWith("$ACTION")) {
      values[key] = value.slice(0, 4000);
    }
  }
  return values;
}

const UNAVAILABLE_MESSAGE =
  "We couldn't send your enquiry just now. Please call or message us on WhatsApp and we'll pick it up straight away.";

const THROTTLED_MESSAGE =
  "We've received several messages from you in a short time. Please call or message us on WhatsApp instead.";

async function clientKey(): Promise<string | null> {
  const list = await headers();
  const forwarded = list.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || list.get("x-real-ip") || null;
}

/**
 * One pipeline for every form: throttle → parse → validate → deliver. Keeping
 * it in one place means every form behaves identically on failure, which is
 * what makes the error states trustworthy.
 */
async function submit<Schema extends z.ZodType<LeadInput>>(
  schema: Schema,
  formData: FormData,
  kind: LeadInput["kind"],
): Promise<FormState> {
  const values = readValues(formData);

  const parsed = schema.safeParse({ ...values, website: formData.get("website") ?? "", kind });
  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    // A filled honeypot is a bot: answer as a failure without revealing why.
    if (flattened.fieldErrors && "website" in flattened.fieldErrors) {
      return { status: "unavailable", message: UNAVAILABLE_MESSAGE, values };
    }
    return { status: "invalid", fieldErrors: flattened.fieldErrors as Record<string, string[]>, values };
  }

  if (!allowSubmission(await clientKey())) {
    return { status: "unavailable", message: THROTTLED_MESSAGE, values };
  }

  const result = await deliverLead(parsed.data);
  if (!result.delivered) {
    return { status: "unavailable", message: UNAVAILABLE_MESSAGE, values };
  }

  return { status: "success", reference: result.reference };
}

export async function submitVehicleEnquiry(_prev: FormState, formData: FormData): Promise<FormState> {
  return submit(vehicleEnquirySchema, formData, "vehicle-enquiry");
}

export async function submitFinanceEnquiry(_prev: FormState, formData: FormData): Promise<FormState> {
  return submit(financeSchema, formData, "finance");
}

export async function submitPartExchange(_prev: FormState, formData: FormData): Promise<FormState> {
  return submit(partExchangeSchema, formData, "part-exchange");
}

export async function submitContact(_prev: FormState, formData: FormData): Promise<FormState> {
  return submit(contactSchema, formData, "contact");
}
