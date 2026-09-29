/**
 * Sliding-window throttling per client address, in memory, per process —
 * shared by the website's enquiry forms and the API's sign-in and invitation
 * routes.
 *
 * Good enough to stop one script flooding the enquiry inbox or guessing a
 * password. It resets on restart and is not shared between instances; a
 * multi-instance deployment should move this to a shared store. Addresses are
 * map keys only and are never logged.
 */

/** Requests whose address cannot be read share one bucket rather than going unthrottled. */
const UNKNOWN_CLIENT = "unknown";

/** Expired entries are swept at most this often. */
const SWEEP_INTERVAL_MS = 60_000;

export interface SlidingWindow {
  /** Records one attempt; returns the seconds to wait when over the limit, or 0 when allowed. */
  hit(clientKey: string | null, now?: number): number;
  /** Forgets a caller's attempts. */
  reset(clientKey: string | null): void;
  /** Takes back a caller's most recent allowed attempt, e.g. one that failed on our side. */
  undo(clientKey: string | null): void;
}

export function createSlidingWindow(options: { windowMs: number; max: number; maxClients?: number }): SlidingWindow {
  const maxClients = options.maxClients ?? 10_000;
  const hits = new Map<string, number[]>();
  let lastSweep = 0;

  function sweep(now: number) {
    if (now - lastSweep >= SWEEP_INTERVAL_MS) {
      lastSweep = now;
      for (const [key, times] of hits) {
        if (times.every((time) => now - time >= options.windowMs)) hits.delete(key);
      }
    }
    // Over the cap (many distinct addresses inside one window): the least
    // recently active go first — a Map keeps insertion order — so memory stays
    // bounded whatever arrives, at constant cost per request.
    while (hits.size > maxClients) hits.delete(hits.keys().next().value!);
  }

  return {
    hit(clientKey, now = Date.now()) {
      const key = clientKey || UNKNOWN_CLIENT;
      const recent = (hits.get(key) ?? []).filter((time) => now - time < options.windowMs);
      if (recent.length >= options.max) {
        hits.set(key, recent);
        return Math.max(1, Math.ceil((options.windowMs - (now - recent[0]!)) / 1000));
      }
      recent.push(now);
      // Re-inserted so the most recently active callers are evicted last.
      hits.delete(key);
      hits.set(key, recent);
      sweep(now);
      return 0;
    },
    reset(clientKey) {
      hits.delete(clientKey || UNKNOWN_CLIENT);
    },
    undo(clientKey) {
      hits.get(clientKey || UNKNOWN_CLIENT)?.pop();
    },
  };
}

/**
 * The caller's address, from request headers.
 *
 * On Render every request arrives through Cloudflare, which sets
 * `CF-Connecting-IP` itself and replaces any value the client sent. Elsewhere
 * the right-most `X-Forwarded-For` entry is used: it is the one added by the
 * proxy in front of this server. The left-most entry is whatever the client
 * chose to send, so keying on it let one script dodge the limit by changing it
 * on every request.
 */
export function clientAddressFromHeaders(header: (name: string) => string | null | undefined): string | null {
  if (process.env.RENDER) {
    const edge = header("cf-connecting-ip")?.trim();
    if (edge) return edge;
  }
  const forwarded = header("x-forwarded-for")
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return forwarded?.at(-1) ?? header("x-real-ip")?.trim() ?? null;
}
