"use server";

import { headers } from "next/headers";
import type { z } from "zod";

import { describeError } from "@Stratford-city-motorcars-Ltd/db/errors";
import { clientAddressFromHeaders } from "@Stratford-city-motorcars-Ltd/domain/rate-limit";

import { resolveVehicleBySlug } from "@/lib/inventory/repository";
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
  return clientAddressFromHeaders((name) => list.get(name));
}

/**
 * The car an enquiry is about comes from stock, never from the page that
 * posted it: the hidden fields are only a browser's word for which car it was
 * showing. The slug is resolved against current and previous slugs, and the
 * car's own title is stored. A vehicle enquiry whose slug matches nothing keeps
 * the slug and no title at all, rather than a headline typed by whoever sent
 * the form; the admin flags it as a car we no longer list. A finance or part-
 * exchange enquiry only names a car when it was linked from one, so a slug that
 * matches nothing is dropped rather than shown in the admin as the car.
 */
async function withStoredVehicle(lead: LeadInput): Promise<LeadInput> {
  if (lead.kind === "vehicle-enquiry") {
    const vehicle = await stockVehicle(lead.vehicleSlug);
    return vehicle
      ? { ...lead, vehicleSlug: vehicle.slug, vehicleTitle: vehicle.title }
      : { ...lead, vehicleTitle: "" };
  }
  if ((lead.kind === "finance" || lead.kind === "part-exchange") && lead.vehicleSlug) {
    const vehicle = await stockVehicle(lead.vehicleSlug);
    return { ...lead, vehicleSlug: vehicle?.slug };
  }
  return lead;
}

/**
 * Stock unreadable (the database is down and nothing is cached) is treated as
 * no match: the enquiry can still go out by email or webhook, and losing it
 * over which car it named would be worse.
 */
async function stockVehicle(slug: string | undefined) {
  try {
    return await resolveVehicleBySlug(slug);
  } catch (error) {
    console.error("[leads] could not read stock to resolve the enquiry's car:", describeError(error));
    return null;
  }
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

  const result = await deliverLead(await withStoredVehicle(parsed.data));
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
