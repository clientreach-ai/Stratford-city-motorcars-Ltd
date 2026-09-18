import type { Context } from "hono";
import { getConnInfo } from "@hono/node-server/conninfo";

import { HttpError } from "./http";

/**
 * Sliding-window throttling per client address, in memory, per process.
 *
 * Good enough to stop one script flooding the enquiry inbox. It resets on
 * restart and is not shared between instances; a multi-instance deployment
 * should move this to a shared store. Addresses are map keys only and are
 * never logged.
 */
export function createRateLimiter(options: { windowMs: number; max: number; message: string }) {
  const hits = new Map<string, number[]>();

  /** Records one attempt for this caller, or throws 429 when over the limit. */
  function consume(c: Context): void {
    const key = clientAddress(c);
    if (!key) return;

    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((time) => now - time < options.windowMs);
    if (recent.length >= options.max) {
      hits.set(key, recent);
      c.header("Retry-After", String(Math.ceil((options.windowMs - (now - recent[0]!)) / 1000)));
      throw new HttpError(429, "rate_limited", options.message);
    }
    recent.push(now);
    hits.set(key, recent);

    if (hits.size > 5000) {
      for (const [entry, times] of hits) {
        if (times.every((time) => now - time >= options.windowMs)) hits.delete(entry);
      }
    }
  }

  /**
   * Forgets this caller's attempts — called after a successful sign-in, so a
   * busy showroom (everyone on one office connection) is never locked out by
   * its own staff signing in normally. Only failures count towards the limit.
   */
  consume.reset = function reset(c: Context): void {
    const key = clientAddress(c);
    if (key) hits.delete(key);
  };

  return consume;
}

/**
 * The caller's address. Behind a proxy the first `X-Forwarded-For` hop is used,
 * so in production the API must only be reachable through that proxy.
 */
export function clientAddress(c: Context): string | null {
  const forwarded = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  const real = c.req.header("x-real-ip")?.trim();
  if (real) return real;
  try {
    return getConnInfo(c).remote.address ?? null;
  } catch {
    return null;
  }
}
