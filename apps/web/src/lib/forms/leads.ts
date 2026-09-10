import type { LeadInput } from "./schemas";

/**
 * ============================================================================
 * INTEGRATION POINT — where enquiries actually go.
 * ============================================================================
 *
 * Nothing here pretends to succeed. If no destination is configured the form
 * says so and offers the phone and WhatsApp buttons instead, because a lead
 * that silently vanishes is worse for the dealership than one that never
 * submitted.
 *
 * To switch it on, set `LEADS_WEBHOOK_URL` in `apps/web/.env`. Any endpoint
 * that accepts a JSON POST works — the Hono server in `apps/server`, a CRM
 * webhook, Zapier, Make, or a Resend/Postmark function.
 *
 *     LEADS_WEBHOOK_URL=https://api.example.com/leads
 *     LEADS_WEBHOOK_TOKEN=optional-bearer-token
 *
 * To write straight to Postgres instead, replace the fetch below with the
 * workspace db client:
 *
 *     import { db } from "@Stratford-city-motorcars-Ltd/db";
 *     await db.insert(leads).values({ ...lead, reference, receivedAt });
 *
 * The admin dashboard planned for phase two should read from whichever
 * destination is chosen here.
 */

export type DeliveryResult =
  | { delivered: true; reference: string }
  | { delivered: false; reason: "not-configured" | "upstream-error" };

/** Short human-quotable reference, e.g. SCM-8F2K4Q. */
function createReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `SCM-${suffix}`;
}

export async function deliverLead(lead: LeadInput): Promise<DeliveryResult> {
  const endpoint = process.env.LEADS_WEBHOOK_URL;
  const reference = createReference();

  if (!endpoint) {
    // Loud on the server, honest in the UI. Never swallowed.
    console.error(
      [
        "",
        "  ⚠  Enquiry received but LEADS_WEBHOOK_URL is not configured, so it was not delivered.",
        `     kind=${lead.kind} name=${lead.name} email=${lead.email}`,
        "     Set LEADS_WEBHOOK_URL in apps/web/.env to start capturing enquiries.",
        "     See apps/web/src/lib/forms/leads.ts",
        "",
      ].join("\n"),
    );
    return { delivered: false, reason: "not-configured" };
  }

  const payload = {
    ...lead,
    reference,
    receivedAt: new Date().toISOString(),
    source: "website",
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.LEADS_WEBHOOK_TOKEN
          ? { authorization: `Bearer ${process.env.LEADS_WEBHOOK_TOKEN}` }
          : {}),
      },
      body: JSON.stringify(payload),
      // A customer should not wait on a slow CRM.
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(
        `Lead delivery failed: ${response.status} ${response.statusText} (ref ${reference})`,
      );
      return { delivered: false, reason: "upstream-error" };
    }

    return { delivered: true, reference };
  } catch (error) {
    console.error(`Lead delivery threw (ref ${reference})`, error);
    return { delivered: false, reason: "upstream-error" };
  }
}
