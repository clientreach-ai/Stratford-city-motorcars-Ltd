import type { MetadataRoute } from "next";

import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // Filtered stock URLs stay crawlable — the footer links to several of
        // them — and are kept out of the index by a canonical pointing back at
        // /vehicles instead.
        allow: "/",
      },
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
