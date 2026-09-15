import type { Metadata } from "next";

import { NotFoundContent } from "@/components/site/not-found-content";

/** Rendered inside the site layout when a page calls `notFound()` (an unknown or hidden vehicle). */
// Next.js already returns 404 with a noindex robots tag for this page.
export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <NotFoundContent />
  );
}
