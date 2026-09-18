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
