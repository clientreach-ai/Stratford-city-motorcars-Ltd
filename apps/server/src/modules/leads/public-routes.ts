import {
  contactSchema,
  financeSchema,
  partExchangeSchema,
  vehicleEnquirySchema,
} from "@Stratford-city-motorcars-Ltd/domain/leads/schemas";
import { Hono } from "hono";
import { z } from "zod";

import { errorBody, HttpError, ok } from "../../lib/http";
import { createRateLimiter } from "../../lib/rate-limit";
import { fieldErrors } from "../../lib/validation";
import type { AppEnv } from "../../types";
import { deliverLead } from "./deliver";

/**
 * Website enquiries.
 *
 *   POST /api/leads   { "kind": "vehicle-enquiry" | "finance" | "part-exchange" | "contact", … }
 *
 * Fields are exactly those of the website forms (see the domain lead schemas).
 *   201 { data: { reference } }      stored and/or sent to the dealership
 *   422 validation_failed            with `fields` (one message per field)
 *   429 rate_limited                 6 submissions per 10 minutes per address
 *   503 unavailable                  nothing could record it: offer phone/WhatsApp
 */

const schemas = {
  "vehicle-enquiry": vehicleEnquirySchema,
  finance: financeSchema,
  "part-exchange": partExchangeSchema,
  contact: contactSchema,
} as const;

type LeadKind = keyof typeof schemas;
const kindOnly = z.object({ kind: z.enum(Object.keys(schemas) as [LeadKind, ...LeadKind[]]) });

const UNAVAILABLE =
  "We couldn't send your enquiry just now. Please call or message us on WhatsApp and we'll pick it up straight away.";

/** Counted after validation, as on the website, so correcting a form never locks a customer out. */
const throttle = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 6,
  message: "We've received several messages from you in a short time. Please call or message us on WhatsApp instead.",
});

export const publicLeadRoutes = new Hono<AppEnv>().post("/", async (c) => {
  if (!/^application\/json\b/i.test(c.req.header("content-type") ?? "")) {
    throw new HttpError(415, "unsupported_media_type", "Send the enquiry as application/json.");
  }
  const body: unknown = await c.req.json().catch(() => {
    throw new HttpError(400, "invalid_json", "The request body is not valid JSON.");
  });

  const kind = kindOnly.safeParse(body);
  if (!kind.success) {
    throw new HttpError(422, "validation_failed", "Unknown enquiry type.", { fields: fieldErrors(kind.error) });
  }

  const parsed = schemas[kind.data.kind].safeParse(body);
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    // A filled honeypot is a bot: answer as unavailable without saying why.
    if ("website" in errors) return c.json(errorBody("unavailable", UNAVAILABLE), 503);
    throw new HttpError(422, "validation_failed", "Some fields need attention.", { fields: errors });
  }

  throttle(c);

  const result = await deliverLead(parsed.data);
  if (!result.delivered) return c.json(errorBody("unavailable", UNAVAILABLE), 503);
  return ok(c, { reference: result.reference }, 201);
});
