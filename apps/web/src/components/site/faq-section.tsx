import type { ReactNode } from "react";

import { FaqList } from "@/components/site/faq-list";
import { JsonLd } from "@/components/ui/json-ld";
import { Container, Eyebrow, Section } from "@/components/ui/section";
import type { Faq } from "@/lib/content/faqs";
import { faqSchema } from "@/lib/seo";

/**
 * A heading column beside the questions. Emits FAQPage structured data for
 * exactly the questions it shows, so the markup never describes hidden content.
 * Use it at most once per page.
 */
export function FaqSection({
  faqs,
  eyebrow = "Questions",
  title,
  lede,
  footer,
  tinted = false,
}: {
  faqs: Faq[];
  eyebrow?: string;
  title: string;
  lede?: ReactNode;
  footer?: ReactNode;
  tinted?: boolean;
}) {
  if (faqs.length === 0) return null;

  return (
    <Section tinted={tinted} size="md">
      <JsonLd data={faqSchema(faqs)} />
      <Container>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Eyebrow>{eyebrow}</Eyebrow>
            <h2 className="mt-5 text-[clamp(1.85rem,3.6vw,2.6rem)] leading-tight">{title}</h2>
            {lede ? (
              <p className="mt-5 leading-relaxed text-[var(--muted-foreground)]">{lede}</p>
            ) : null}
            {footer ? <div className="mt-8">{footer}</div> : null}
          </div>
          <FaqList faqs={faqs} />
        </div>
      </Container>
    </Section>
  );
}
