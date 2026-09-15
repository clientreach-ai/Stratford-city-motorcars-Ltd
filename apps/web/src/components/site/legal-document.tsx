import { PageHero } from "@/components/site/page-hero";
import { Container, Section } from "@/components/ui/section";
import { beingPrepared, type LegalPlaceholder } from "@/lib/content/legal";
import { site } from "@/lib/site";

/**
 * Interim page for a legal document that is still being prepared. It makes no
 * legal statements of its own — it says the document is not yet available and
 * how to contact the business in the meantime. See `lib/content/legal.ts`.
 */
export function LegalPlaceholderPage({
  document,
  crumbs,
}: {
  document: LegalPlaceholder;
  crumbs: { name: string; path: string }[];
}) {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title={document.title}
        lede={`${beingPrepared(document)} and will be published on this page.`}
        crumbs={crumbs}
      />

      <Section size="md">
        <Container>
          <div className="max-w-2xl space-y-5 leading-[1.75] text-[var(--muted-foreground)]">
            <p>If you have a question in the meantime, please contact us.</p>

            <dl className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
              <div className="grid gap-1 py-3.5 sm:grid-cols-[8rem_1fr] sm:gap-6">
                <dt className="text-sm font-medium text-[var(--foreground)]">Email</dt>
                <dd className="text-sm">
                  <a
                    href={`mailto:${site.email}`}
                    className="inline-block break-all py-1 transition-colors hover:text-[var(--foreground)]"
                  >
                    {site.email}
                  </a>
                </dd>
              </div>
              <div className="grid gap-1 py-3.5 sm:grid-cols-[8rem_1fr] sm:gap-6">
                <dt className="text-sm font-medium text-[var(--foreground)]">Phone</dt>
                <dd className="text-sm">
                  <a
                    href={site.phone.href}
                    className="inline-block py-1 transition-colors hover:text-[var(--foreground)]"
                  >
                    {site.phone.display}
                  </a>
                </dd>
              </div>
              <div className="grid gap-1 py-3.5 sm:grid-cols-[8rem_1fr] sm:gap-6">
                <dt className="text-sm font-medium text-[var(--foreground)]">Address</dt>
                <dd className="text-sm">{site.address.full}</dd>
              </div>
            </dl>
          </div>
        </Container>
      </Section>
    </>
  );
}
