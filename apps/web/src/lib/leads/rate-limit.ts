import "server-only";

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
const WINDOW_MS = 10 * 60 * 1000;
const MAX_SUBMISSIONS = 6;
const hits = new Map<string, number[]>();

export function allowSubmission(clientKey: string | null, now = Date.now()): boolean {
  if (!clientKey) return true;
  const recent = (hits.get(clientKey) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_SUBMISSIONS) {
    hits.set(clientKey, recent);
    return false;
  }
  recent.push(now);
  hits.set(clientKey, recent);

  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every((time) => now - time >= WINDOW_MS)) hits.delete(key);
    }
  }
  return true;
}
