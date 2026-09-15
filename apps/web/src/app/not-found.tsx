import type { Metadata } from "next";

import { NotFoundContent } from "@/components/site/not-found-content";
import { SiteChrome } from "@/components/site/site-chrome";

/**
 * Global 404 for URLs that match no route — including the legacy site's
 * `/hire` pages, which have no equivalent here. It renders inside the root
 * layout, which carries no site chrome, so the chrome is added here. Next.js
 * returns 404 and marks the page noindex.
 */
// Next.js already returns 404 with a noindex robots tag for this page.
export const metadata: Metadata = { title: "Page not found" };

export default function GlobalNotFound() {
  return (
    <SiteChrome>
      <NotFoundContent />
    </SiteChrome>
  );
}
