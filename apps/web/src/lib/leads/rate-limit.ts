import "server-only";

import { createSlidingWindow } from "@Stratford-city-motorcars-Ltd/domain/rate-limit";

/**
 * Best-effort submission throttling, per client address, per server process.
 *
 * Alongside the honeypot and the link limit in the schemas this stops a
 * single script from flooding the enquiry inbox. It is in memory, so it resets
 * on restart and is not shared between instances; a hosted deployment that
 * sees real abuse should add a shared limiter or a CAPTCHA provider (none is
 * configured — see docs).
 *
 * Addresses are used as map keys only, held for the window, and never logged.
 */
const submissions = createSlidingWindow({ windowMs: 10 * 60 * 1000, max: 6 });

export function allowSubmission(clientKey: string | null, now = Date.now()): boolean {
  return submissions.hit(clientKey, now) === 0;
}
