/**
 * Interim legal pages.
 *
 * The previous privacy, terms and cookie pages reproduced the old website's
 * boilerplate, which the client has not approved and which contained false
 * claims (vehicle hire terms, an AA warranty, a £99 reservation deposit, broker
 * and lender statements, an invented complaints procedure, analytics and
 * advertising cookies the site does not set, and a "last updated" date for
 * policies the business never had).
 *
 * The client confirmed it has no written terms, privacy policy or complaints
 * procedure. Until properly drafted documents are supplied, each route shows a
 * neutral placeholder, is marked noindex and is left out of the sitemap.
 *
 * Do not write policy wording here. Replace a placeholder only with a document
 * the client (and its legal adviser) has approved.
 */

export interface LegalPlaceholder {
  /** Page title and breadcrumb label. */
  title: string;
  /** Lower-case name used in running copy, e.g. "privacy policy". */
  documentName: string;
  /** "Our terms and conditions are…" rather than "…is…". */
  plural: boolean;
}

export const legalPlaceholders = {
  privacy: { title: "Privacy Policy", documentName: "privacy policy", plural: false },
  terms: { title: "Terms & Conditions", documentName: "terms and conditions", plural: true },
  cookies: { title: "Cookie Policy", documentName: "cookie policy", plural: false },
} satisfies Record<string, LegalPlaceholder>;

/** "Our privacy policy is being prepared" / "Our terms and conditions are being prepared". */
export function beingPrepared(document: LegalPlaceholder): string {
  return `Our ${document.documentName} ${document.plural ? "are" : "is"} being prepared`;
}
