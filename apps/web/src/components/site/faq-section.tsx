import type { ReactNode } from "react";

import { FaqList } from "@/components/site/faq-list";
import { JsonLd } from "@/components/ui/json-ld";
import { Container, Eyebrow, Section } from "@/components/ui/section";
import { SplitText } from "@/components/ui/split-text";
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
          <div className="lg:sticky lg:top-32 lg:self-start">
            <Eyebrow className="reveal">{eyebrow}</Eyebrow>
            <SplitText runs={title} className="mt-6 text-[clamp(2rem,3.8vw,3rem)] leading-[1.05] tracking-[-0.022em]" />
            {lede ? (
              <p className="reveal mt-6 leading-relaxed text-[var(--muted-foreground)]">{lede}</p>
            ) : null}
            {footer ? <div className="reveal mt-8">{footer}</div> : null}
          </div>
          <div className="reveal">
            <FaqList faqs={faqs} />
          </div>
        </div>
      </Container>
    </Section>
  );
}
