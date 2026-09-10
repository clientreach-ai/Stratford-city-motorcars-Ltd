import type { Metadata } from "next";

import { LegalDocumentPage } from "@/components/site/legal-document";
import { JsonLd } from "@/components/ui/json-ld";
import { privacyPolicy } from "@/lib/content/legal";
import { breadcrumbSchema, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "How Stratford City Motorcars collects, uses and protects your personal information under UK GDPR and the Data Protection Act 2018.",
  path: "/privacy",
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Privacy", path: "/privacy" },
];

export default function PrivacyPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema(crumbs)} />
      <LegalDocumentPage document={privacyPolicy} crumbs={crumbs} />
    </>
  );
}
