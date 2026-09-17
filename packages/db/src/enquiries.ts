import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import type { Database } from "./index";
import { customer, lead, leadActivity } from "./schema";

/**
 * Records one website enquiry: the `lead` row, its first activity entry and
 * the link to a customer. The website and the API both store enquiries through
 * here so the admin always finds them in the same shape.
 *
 * Customers are matched by lower-cased email, then by phone digits; otherwise
 * a new customer is created. The grouping is a best guess and is correctable
 * later in the admin.
 */

export interface WebsiteEnquiry {
  reference: string;
  kind: string;
  name: string;
  email: string | null;
  phone: string | null;
  vehicleSlug: string | null;
  /** The validated submission, without the honeypot. */
  payload: unknown;
}

export const emailKey = (email: string | null | undefined) => email?.trim().toLowerCase() || null;

export const phoneKey = (phone: string | null | undefined) => {
  let digits = phone?.replace(/\D/g, "") ?? "";
  if (digits.startsWith("44")) digits = `0${digits.slice(2)}`;
  return digits.length >= 10 ? digits : null;
};

export async function recordWebsiteEnquiry(db: Database, enquiry: WebsiteEnquiry): Promise<{ id: string; customerId: string }> {
  return db.transaction(async (tx) => {
    const byEmail = emailKey(enquiry.email);
    const byPhone = phoneKey(enquiry.phone);

    let match: { id: string } | undefined;
    if (byEmail) {
      [match] = await tx.select({ id: customer.id }).from(customer).where(eq(customer.emailKey, byEmail)).limit(1);
    }
    if (!match && byPhone) {
      [match] = await tx.select({ id: customer.id }).from(customer).where(eq(customer.phoneKey, byPhone)).limit(1);
    }

    const customerId = match?.id ?? randomUUID();
    if (!match) {
      await tx.insert(customer).values({
        id: customerId,
        name: enquiry.name,
        email: enquiry.email,
        phone: enquiry.phone,
        emailKey: byEmail,
        phoneKey: byPhone,
      });
    }

    const id = randomUUID();
    const now = new Date();
    await tx.insert(lead).values({
      id,
      reference: enquiry.reference,
      kind: enquiry.kind,
      status: "new",
      name: enquiry.name,
      email: enquiry.email,
      phone: enquiry.phone,
      vehicleSlug: enquiry.vehicleSlug,
      payload: enquiry.payload,
      customerId,
      createdAt: now,
      updatedAt: now,
    });
    await tx.insert(leadActivity).values({
      id: randomUUID(),
      leadId: id,
      type: "created",
      body: "Enquiry received from the website.",
      authorId: null,
      authorName: "Website",
      createdAt: now,
    });

    return { id, customerId };
  });
}
