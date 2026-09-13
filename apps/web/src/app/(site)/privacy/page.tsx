import type { Metadata } from "next";

import { LegalPlaceholderPage } from "@/components/site/legal-document";
import { JsonLd } from "@/components/ui/json-ld";
import { beingPrepared, legalPlaceholders } from "@/lib/content/legal";
import { breadcrumbSchema, pageMetadata } from "@/lib/seo";

const document = legalPlaceholders.privacy;

// Interim placeholder: kept out of search results until an approved policy exists.
export const metadata: Metadata = pageMetadata({
  title: document.title,
  description: `${beingPrepared(document)}.`,
  path: "/privacy",
  noIndex: true,
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Privacy", path: "/privacy" },
];

export default function PrivacyPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema(crumbs)} />
      <LegalPlaceholderPage document={document} crumbs={crumbs} />
    </>
  );
}
