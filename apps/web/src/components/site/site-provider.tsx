"use client";

import { createContext, use } from "react";

import { site as confirmedSite, type Site } from "@/lib/site";

/**
 * The owner's saved business details, for client components.
 *
 * Server components call `getSite()`; the browser cannot, so `SiteChrome`
 * reads it once and hands it down here. The confirmed facts are the default
 * only for anything rendered outside the chrome (the root error page), where
 * a possibly stale number is still better than none.
 */
const SiteContext = createContext<Site>(confirmedSite);

export function SiteProvider({ site, children }: { site: Site; children: React.ReactNode }) {
  return <SiteContext value={site}>{children}</SiteContext>;
}

export function useSite(): Site {
  return use(SiteContext);
}
