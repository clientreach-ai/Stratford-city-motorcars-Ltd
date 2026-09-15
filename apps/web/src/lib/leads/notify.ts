import "server-only";

import type { LeadInput } from "@/lib/forms/schemas";

/**
 * ============================================================================
 * INTEGRATION POINT — telling the dealership about a new enquiry.
 * ============================================================================
 *
 * The client wants new enquiries by **email and SMS** (intake). No email or SMS
 * provider has been chosen, so none is wired in and no credentials are assumed.
 *
 * What exists:
 *  - `webhook` — POSTs the enquiry as JSON to `LEADS_WEBHOOK_URL`
 *    (optional bearer token `LEADS_WEBHOOK_TOKEN`). Zapier, Make or n8n can
 *    turn that into a Gmail message and an SMS today with no code change.
 *
 * What to add once a provider is chosen (implement `LeadNotifier`, then list
 * it in `configuredNotifiers()`):
 *  - email: e.g. Resend or Postmark → the business Gmail address
 *  - SMS: e.g. Twilio → the business mobile
 *  - CRM: the client mentioned Autotrader's CRM; a webhook adapter fits
 *
 * A notifier must never log the customer's name, contact details or message.
 */
export interface LeadNotifier {
  readonly name: string;
  notify(lead: LeadInput, meta: { reference: string; receivedAt: string }): Promise<void>;
}

export function webhookNotifier(endpoint: string, token?: string): LeadNotifier {
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
        body: JSON.stringify({ ...rest, reference: meta.reference, receivedAt: meta.receivedAt, source: "website" }),
        // A customer should not wait on a slow integration.
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`Webhook responded ${response.status}`);
    },
  };
}

export function configuredNotifiers(): LeadNotifier[] {
  const notifiers: LeadNotifier[] = [];
  const endpoint = process.env.LEADS_WEBHOOK_URL?.trim();
  if (endpoint && /^https?:\/\//.test(endpoint)) {
    notifiers.push(webhookNotifier(endpoint, process.env.LEADS_WEBHOOK_TOKEN?.trim() || undefined));
  }
  return notifiers;
}
