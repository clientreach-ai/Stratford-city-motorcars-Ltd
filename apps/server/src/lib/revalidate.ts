import { env } from "@Stratford-city-motorcars-Ltd/env/server";

let warned = false;

/**
 * Asks the website to drop its cached stock (or business settings) so an edit
 * shows on the next page view. Best effort: the website's cache also expires on its own within five
 * minutes, so a failure here only delays the change and never fails the save.
 */
export function revalidateWebsite(tag: "inventory" | "settings" = "inventory"): void {
  const url = env.WEB_REVALIDATE_URL;
  const secret = env.REVALIDATE_SECRET;
  if (!url || !secret) {
    if (!warned) {
      warned = true;
      console.warn("[revalidate] WEB_REVALIDATE_URL or REVALIDATE_SECRET is not set; the website will show stock changes within 5 minutes.");
    }
    return;
  }

  fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
    body: JSON.stringify({ tag }),
    signal: AbortSignal.timeout(5_000),
  })
    .then((response) => {
      if (!response.ok) console.warn(`[revalidate] website responded ${response.status}`);
    })
    .catch((error: unknown) => {
      console.warn(`[revalidate] website unreachable: ${error instanceof Error ? error.message : "unknown error"}`);
    });
}

/**
 * The enquiry notification channels the website sends ("email", "webhook"),
 * or null when it can't be asked: no WEB_REVALIDATE_URL or REVALIDATE_SECRET,
 * or no answer within a few seconds. The website sends enquiry notifications,
 * so only it knows what is set up.
 */
export async function websiteNotificationChannels(): Promise<string[] | null> {
  const url = env.WEB_REVALIDATE_URL;
  const secret = env.REVALIDATE_SECRET;
  if (!url || !secret) return null;
  try {
    const response = await fetch(new URL("/api/notifications", url), {
      headers: { authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(4_000),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { channels?: unknown };
    return Array.isArray(body.channels) ? body.channels.filter((channel): channel is string => typeof channel === "string") : null;
  } catch {
    return null;
  }
}
