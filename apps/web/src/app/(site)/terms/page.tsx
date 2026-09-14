import type { Metadata } from "next";

import { LegalPlaceholderPage } from "@/components/site/legal-document";
import { JsonLd } from "@/components/ui/json-ld";
import { beingPrepared, legalPlaceholders } from "@/lib/content/legal";
import { breadcrumbSchema, pageMetadata } from "@/lib/seo";

const document = legalPlaceholders.terms;

// Interim placeholder: kept out of search results until approved terms exist.
export const metadata: Metadata = pageMetadata({
  title: document.title,
  description: `${beingPrepared(document)}.`,
  path: "/terms",
  noIndex: true,
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Terms", path: "/terms" },
];

export default function TermsPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema(crumbs)} />
      <LegalPlaceholderPage document={document} crumbs={crumbs} />
    </>
  );
}
