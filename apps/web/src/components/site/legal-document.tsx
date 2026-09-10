import { PageHero } from "@/components/site/page-hero";
import { Container, Section } from "@/components/ui/section";
import type { Block, LegalDocument } from "@/lib/content/legal";

/**
 * Renders a legal document from structured content, so privacy, terms and
 * cookies all read identically and the copy stays in one reviewable file
 * rather than scattered through JSX.
 */
export function LegalDocumentPage({
  document,
  crumbs,
}: {
  document: LegalDocument;
  crumbs: { name: string; path: string }[];
}) {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title={document.title}
        lede={document.intro}
        crumbs={crumbs}
      />

      <Section size="md">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[minmax(0,16rem)_1fr] lg:gap-20">
            {/* Contents rail — long documents need a way in. */}
            <nav aria-label="On this page" className="lg:sticky lg:top-28 lg:self-start">
              <p className="font-roman text-[0.625rem] uppercase tracking-[0.22em] text-[var(--rule)]">
                Contents
              </p>
              <ol className="mt-5 space-y-2.5">
                {document.sections.map((section, index) => (
                  <li key={section.heading}>
                    <a
                      href={`#${slug(section.heading)}`}
                      className="flex gap-3 text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                    >
                      <span data-numeric className="tabular-nums">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {section.heading}
                    </a>
                  </li>
                ))}
              </ol>
              <p className="mt-8 border-t border-[var(--border)] pt-5 text-xs text-[var(--muted-foreground)]">
                Last updated {document.updated}
              </p>
            </nav>

            <div className="min-w-0 space-y-14">
              {document.sections.map((section, index) => (
                <section
                  key={section.heading}
                  id={slug(section.heading)}
                  className="scroll-mt-28"
                >
                  <h2 className="flex gap-4 border-b border-[var(--border)] pb-4 text-[clamp(1.35rem,2.6vw,1.75rem)] leading-tight">
                    <span
                      aria-hidden
                      data-numeric
                      className="font-display text-sm text-[var(--rule)]"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {section.heading}
                  </h2>

                  <div className="mt-6 space-y-5">
                    {section.blocks.map((block, blockIndex) => (
                      <BlockContent key={blockIndex} block={block} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}

function BlockContent({ block }: { block: Block }) {
  if (block.type === "p") {
    return (
      <p className="max-w-3xl leading-[1.75] text-[var(--muted-foreground)]">
        {block.text}
      </p>
    );
  }

  if (block.type === "subheading") {
    return (
      <h3 className="pt-2 font-roman text-[0.625rem] uppercase tracking-[0.2em] text-[var(--foreground)]">
        {block.text}
      </h3>
    );
  }

  if (block.type === "list") {
    return (
      <ul className="max-w-3xl space-y-2.5">
        {block.items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-3 leading-relaxed text-[var(--muted-foreground)]"
          >
            <span aria-hidden className="mt-2.5 size-1 shrink-0 bg-[var(--rule)]" />
            {item}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <dl className="max-w-3xl divide-y divide-[var(--border)] border-y border-[var(--border)]">
      {block.items.map((item) => (
        <div key={item.term} className="grid gap-1 py-3.5 sm:grid-cols-[12rem_1fr] sm:gap-6">
          <dt className="text-sm font-medium">{item.term}</dt>
          <dd className="text-sm leading-relaxed text-[var(--muted-foreground)]">
            {item.detail}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
