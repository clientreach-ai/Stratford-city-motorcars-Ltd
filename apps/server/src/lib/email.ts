import { env } from "@Stratford-city-motorcars-Ltd/env/server";

/**
 * Outbound email to team members. Invitations are the only email the admin
 * sends — nothing here ever writes to a customer.
 *
 * Sent through Resend when RESEND_API_KEY and EMAIL_FROM are set. Without
 * them, in development the message is printed to the server console so an
 * invitation can still be accepted locally; in production sending fails.
 */

export interface Email {
  to: string;
  subject: string;
  text: string;
}

export function emailConfigured(): boolean {
  return Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);
}

export async function sendEmail(message: Email): Promise<void> {
  if (!emailConfigured()) {
    if (env.NODE_ENV === "production") throw new Error("Email is not configured (RESEND_API_KEY, EMAIL_FROM).");
    console.info(`[email] not configured — development copy of "${message.subject}":\n${message.text}\n`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [message.to], subject: message.subject, text: message.text }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Email provider responded ${response.status}`);
}
