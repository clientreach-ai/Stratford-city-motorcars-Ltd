import type { Context } from "hono";
import { getConnInfo } from "@hono/node-server/conninfo";
import { clientAddressFromHeaders, createSlidingWindow } from "@Stratford-city-motorcars-Ltd/domain/rate-limit";

import { HttpError } from "./http";

/**
 * Sliding-window throttling per client address, in memory, per process (see
 * packages/domain/src/rate-limit.ts). Addresses are map keys only and are
 * never logged.
 */
export function createRateLimiter(options: { windowMs: number; max: number; message: string }) {
  const window = createSlidingWindow(options);

  /** Records one attempt for this caller, or throws 429 when over the limit. */
  function consume(c: Context): void {
    const retryAfter = window.hit(clientAddress(c));
    if (retryAfter > 0) {
      c.header("Retry-After", String(retryAfter));
      throw new HttpError(429, "rate_limited", options.message);
    }
  }

  /**
   * Forgets this caller's attempts — called after a successful sign-in, so a
   * busy showroom (everyone on one office connection) is never locked out by
   * its own staff signing in normally. Only failures count towards the limit.
   */
  consume.reset = function reset(c: Context): void {
    window.reset(clientAddress(c));
  };

  return consume;
}

/** The caller's address: from the proxy in front of this server, else the socket. */
export function clientAddress(c: Context): string | null {
  const fromHeaders = clientAddressFromHeaders((name) => c.req.header(name));
  if (fromHeaders) return fromHeaders;
  try {
    return getConnInfo(c).remote.address ?? null;
  } catch {
    return null;
  }
}
