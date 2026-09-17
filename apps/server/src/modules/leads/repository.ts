import { recordWebsiteEnquiry } from "@Stratford-city-motorcars-Ltd/db";
import type { LeadInput } from "@Stratford-city-motorcars-Ltd/domain/leads/schemas";

import { db } from "../../lib/db";

/**
 * Stores a website enquiry exactly as the website does: the `lead` row, its
 * first activity entry and the customer link. The stored payload is the
 * validated submission minus the honeypot; no IP address is kept.
 */
export async function insertLead(input: LeadInput, reference: string): Promise<void> {
  const { website: _honeypot, ...payload } = input;
  await recordWebsiteEnquiry(db, {
    reference,
    kind: input.kind,
    name: input.name,
    email: "email" in input ? input.email : null,
    phone: "phone" in input && input.phone ? input.phone : null,
    vehicleSlug: "vehicleSlug" in input && input.vehicleSlug ? input.vehicleSlug : null,
    payload,
  });
}
