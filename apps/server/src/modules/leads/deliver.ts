import { env } from "@Stratford-city-motorcars-Ltd/env/server";
import { createLeadReference } from "@Stratford-city-motorcars-Ltd/domain/leads/reference";
import type { LeadInput } from "@Stratford-city-motorcars-Ltd/domain/leads/schemas";

import { insertLead } from "./repository";

/**
 * Where an enquiry goes — the same contract as the website's server actions.
 *
 * An enquiry counts as received only when it is stored in the database and/or
 * accepted by a notifier (the webhook today). Otherwise the caller is told it
 * failed, so the customer can be offered the phone and WhatsApp instead.
 * Logs carry the form kind, reference and channel outcomes only — never
 * personal data.
 */

export interface LeadNotifier {
  readonly name: string;
  notify(lead: LeadInput, meta: { reference: string; receivedAt: string }): Promise<void>;
}

function webhookNotifier(endpoint: string, token?: string): LeadNotifier {
  return {
    name: "webhook",
    async notify(lead, meta) {
      const { website: _honeypot, ...rest } = lead;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ...rest, reference: meta.reference, receivedAt: meta.receivedAt, source: "api" }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`Webhook responded ${response.status}`);
    },
  };
}

/** Email (e.g. Resend) and SMS (e.g. Twilio) notifiers go here once a provider is chosen. */
function configuredNotifiers(): LeadNotifier[] {
  return env.LEADS_WEBHOOK_URL ? [webhookNotifier(env.LEADS_WEBHOOK_URL, env.LEADS_WEBHOOK_TOKEN)] : [];
}

export type DeliveryResult =
  | { delivered: true; reference: string; stored: boolean; notified: string[] }
  | { delivered: false };

export async function deliverLead(lead: LeadInput): Promise<DeliveryResult> {
  const reference = createLeadReference();
  const receivedAt = new Date().toISOString();

  let stored = false;
  try {
    await insertLead(lead, reference);
    stored = true;
  } catch (error) {
    console.error(`[leads] could not store enquiry kind=${lead.kind} ref=${reference}:`, describe(error));
  }

  const notifiers = configuredNotifiers();
  const outcomes = await Promise.allSettled(notifiers.map((notifier) => notifier.notify(lead, { reference, receivedAt })));
  const notified: string[] = [];
  outcomes.forEach((outcome, index) => {
    const name = notifiers[index]!.name;
    if (outcome.status === "fulfilled") notified.push(name);
    else console.error(`[leads] ${name} failed kind=${lead.kind} ref=${reference}:`, describe(outcome.reason));
  });

  if (!stored && notified.length === 0) {
    console.error(`[leads] enquiry NOT delivered kind=${lead.kind} ref=${reference}: every channel failed`);
    return { delivered: false };
  }
  if (notifiers.length === 0) {
    console.warn(`[leads] enquiry stored without notification kind=${lead.kind} ref=${reference}: no notifier configured`);
  }
  return { delivered: true, reference, stored, notified };
}

function describe(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`.slice(0, 300);
  return "unknown error";
}
