import type { Metadata } from "next";

import { LegalDocumentPage } from "@/components/site/legal-document";
import { JsonLd } from "@/components/ui/json-ld";
import { cookiePolicy } from "@/lib/content/legal";
import { breadcrumbSchema, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Cookie Policy",
  description:
    "How Stratford City Motorcars uses cookies, what each type does, and how to control them in your browser.",
  path: "/cookies",
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Cookies", path: "/cookies" },
];

export default function CookiesPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema(crumbs)} />
      <LegalDocumentPage document={cookiePolicy} crumbs={crumbs} />
    </>
  );
}
