import "server-only";

import type { LeadInput } from "@/lib/forms/schemas";

import { configuredNotifiers } from "./notify";
import { createLeadReference } from "./reference";
import { insertLead, leadStorageAvailable } from "./store";

/**
 * Where an enquiry goes. Nothing here pretends to succeed.
 *
 * An enquiry counts as received only when it is safely kept somewhere the
 * dealership will see it:
 *  - stored in the database (it appears in the dashboard), and/or
 *  - accepted by a configured notifier (the webhook today).
 *
 * If neither happens the customer is told plainly and offered the phone and
 * WhatsApp instead — a lead that silently vanishes is worse than one that never
 * submitted. Logs carry the form kind, reference and channel outcomes only,
 * never personal data.
 */

export type DeliveryResult =
  | { delivered: true; reference: string; stored: boolean; notified: string[] }
  | { delivered: false; reason: "not-configured" | "failed" };

export async function deliverLead(lead: LeadInput): Promise<DeliveryResult> {
  const reference = createLeadReference();
  const receivedAt = new Date().toISOString();

  let stored = false;
  if (leadStorageAvailable()) {
    try {
      await insertLead(lead, reference);
      stored = true;
    } catch (error) {
      console.error(`[leads] could not store enquiry kind=${lead.kind} ref=${reference}:`, describe(error));
    }
  }

  const notifiers = configuredNotifiers();
  const outcomes = await Promise.allSettled(
    notifiers.map((notifier) => notifier.notify(lead, { reference, receivedAt })),
  );
  const notified: string[] = [];
  outcomes.forEach((outcome, index) => {
    const name = notifiers[index]!.name;
    if (outcome.status === "fulfilled") notified.push(name);
    else console.error(`[leads] ${name} failed kind=${lead.kind} ref=${reference}:`, describe(outcome.reason));
  });

  if (!stored && notified.length === 0) {
    const configured = leadStorageAvailable() || notifiers.length > 0;
    console.error(
      configured
        ? `[leads] enquiry NOT delivered kind=${lead.kind} ref=${reference}: every configured channel failed`
        : `[leads] enquiry NOT delivered kind=${lead.kind} ref=${reference}: no DATABASE_URL or LEADS_WEBHOOK_URL is configured`,
    );
    return { delivered: false, reason: configured ? "failed" : "not-configured" };
  }

  if (stored && notifiers.length === 0) {
    // Recorded for the dashboard, but nobody is told. Flag it for the operator.
    console.warn(`[leads] enquiry stored without notification kind=${lead.kind} ref=${reference}: no notifier configured`);
  }

  return { delivered: true, reference, stored, notified };
}

/** Error summary without request bodies or payloads. */
function describe(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`.slice(0, 300);
  return "unknown error";
}
