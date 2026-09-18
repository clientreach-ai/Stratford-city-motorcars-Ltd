import "server-only";

import type { LeadInput } from "@/lib/forms/schemas";

/**
 * ============================================================================
 * INTEGRATION POINT — telling the dealership about a new enquiry.
 * ============================================================================
 *
 * The client wants new enquiries by **email and SMS** (intake).
 *
 * What exists:
 *  - `email` — sends the enquiry to the dealership through Resend. On as soon
 *    as RESEND_API_KEY, EMAIL_FROM and ENQUIRY_EMAIL_TO are set; off (and
 *    reported as off in the admin's Settings) until then.
 *  - `webhook` — POSTs the enquiry as JSON to `LEADS_WEBHOOK_URL`
 *    (optional bearer token `LEADS_WEBHOOK_TOKEN`). Zapier, Make or n8n can
 *    turn that into an SMS today with no code change.
 *
 * Still to add (implement `LeadNotifier`, then list it in
 * `configuredNotifiers()`):
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

/**
 * Emails the dealership through Resend. The message carries what is needed to
 * ring the customer back — their name, contact details and what they asked
 * about — and goes only to the dealership's own address.
 */
export function emailNotifier(config: { apiKey: string; from: string; to: string }): LeadNotifier {
  return {
    name: "email",
    async notify(lead, meta) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${config.apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          from: config.from,
          to: [config.to],
          reply_to: "email" in lead && lead.email ? lead.email : undefined,
          subject: `${enquiryLabel(lead.kind)} — ${lead.name} (${meta.reference})`,
          text: emailBody(lead, meta),
        }),
        // A customer should not wait on a slow provider.
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`Email provider responded ${response.status}`);
    },
  };
}

const ENQUIRY_LABELS: Record<string, string> = {
  "vehicle-enquiry": "Car enquiry",
  finance: "Finance enquiry",
  "part-exchange": "Part-exchange valuation",
  contact: "Website message",
};

function enquiryLabel(kind: string): string {
  return ENQUIRY_LABELS[kind] ?? "Website enquiry";
}

/** Plain text: every answer the customer gave, in the order they gave it. */
function emailBody(lead: LeadInput, meta: { reference: string; receivedAt: string }): string {
  const { website: _honeypot, kind: _kind, ...answers } = lead as Record<string, unknown> & LeadInput;
  const lines = Object.entries(answers)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${label(key)}: ${String(value)}`);

  return [
    `${enquiryLabel(lead.kind)} from the website.`,
    "",
    ...lines,
    "",
    `Reference: ${meta.reference}`,
    `Received: ${new Date(meta.receivedAt).toLocaleString("en-GB", { timeZone: "Europe/London" })}`,
    "",
    "Reply to this email to answer the customer, or open the admin to record what happens next.",
  ].join("\n");
}

/** "preferredDate" → "Preferred date". */
function label(key: string): string {
  const words = key.replace(/([A-Z])/g, " $1").toLowerCase().trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function configuredNotifiers(): LeadNotifier[] {
  const notifiers: LeadNotifier[] = [];
  const endpoint = process.env.LEADS_WEBHOOK_URL?.trim();
  if (endpoint && /^https?:\/\//.test(endpoint)) {
    notifiers.push(webhookNotifier(endpoint, process.env.LEADS_WEBHOOK_TOKEN?.trim() || undefined));
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const to = process.env.ENQUIRY_EMAIL_TO?.trim();
  if (apiKey && from && to) notifiers.push(emailNotifier({ apiKey, from, to }));

  return notifiers;
}
