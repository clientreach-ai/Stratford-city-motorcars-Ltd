import type { Metadata } from "next";

import { LegalDocumentPage } from "@/components/site/legal-document";
import { JsonLd } from "@/components/ui/json-ld";
import { termsDocument } from "@/lib/content/legal";
import { breadcrumbSchema, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Terms & Conditions",
  description:
    "Terms and conditions for vehicle sales, hire, finance and part exchange at Stratford City Motorcars.",
  path: "/terms",
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Terms", path: "/terms" },
];

export default function TermsPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema(crumbs)} />
      <LegalDocumentPage document={termsDocument} crumbs={crumbs} />
    </>
  );
}
