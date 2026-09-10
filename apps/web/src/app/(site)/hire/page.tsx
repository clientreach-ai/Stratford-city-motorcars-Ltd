import type { Metadata } from "next";
import { Check, Phone } from "lucide-react";

import { FaqList } from "@/components/site/faq-list";
import { PageHero } from "@/components/site/page-hero";
import { ExternalButtonLink } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/icons";
import { JsonLd } from "@/components/ui/json-ld";
import { Container, Eyebrow, Section, SectionHeading } from "@/components/ui/section";
import { faqsByCategory } from "@/lib/content/faqs";
import { hire } from "@/lib/content/services";
import { breadcrumbSchema, faqSchema, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { whatsappLinks } from "@/lib/whatsapp";

export const metadata: Metadata = pageMetadata({
  title: "Executive & Everyday Car Hire",
  description:
    "Short-term car hire from our Stratford showroom. Comprehensive insurance and 24/7 breakdown cover included, with same-day collection subject to availability.",
  path: "/hire",
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Hire", path: "/hire" },
];

export default function HirePage() {
  const hireFaqs = faqsByCategory("Hire");

  return (
    <>
      <JsonLd data={[breadcrumbSchema(crumbs), faqSchema(hireFaqs)]} />

      <PageHero
        eyebrow="Executive hire"
        title="Hire a car from the same showroom"
        lede={hire.summary}
        crumbs={crumbs}
      />

      {/* ---- Included / requirements --------------------------------------- */}
      <Section size="md">
        <Container>
          <SectionHeading
            eyebrow="The essentials"
            title="What's included, and what you'll need"
            lede="Rates start from an indicative £39 a day and depend on the vehicle and length of hire. Call us for a firm quote — we'd rather give you the real number than a headline one."
          />

          <div className="mt-14 grid gap-px bg-[var(--border)] lg:grid-cols-2">
            <div className="bg-[var(--background)] p-7 md:p-9">
              <h3 className="font-roman text-[0.625rem] uppercase tracking-[0.22em] text-[var(--rule)]">
                Included in the rate
              </h3>
              <ul className="mt-6 space-y-3.5">
                {hire.included.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <Check
                      aria-hidden
                      className="mt-0.5 size-4 shrink-0 text-[var(--rule)]"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-[var(--background)] p-7 md:p-9">
              <h3 className="font-roman text-[0.625rem] uppercase tracking-[0.22em] text-[var(--rule)]">
                What you&rsquo;ll need
              </h3>
              <ul className="mt-6 space-y-3.5">
                {hire.requirements.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <Check
                      aria-hidden
                      className="mt-0.5 size-4 shrink-0 text-[var(--rule)]"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 border border-[var(--border)] p-7 md:p-9">
            <h3 className="font-roman text-[0.625rem] uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
              Terms worth knowing up front
            </h3>
            <ul className="mt-6 grid gap-x-10 gap-y-3 sm:grid-cols-2">
              {hire.terms.map((term) => (
                <li
                  key={term}
                  className="flex items-start gap-2.5 text-sm text-[var(--muted-foreground)]"
                >
                  <span aria-hidden className="mt-2 size-1 shrink-0 bg-[var(--rule)]" />
                  {term}
                </li>
              ))}
            </ul>
            <p className="mt-6 border-t border-[var(--border)] pt-5 text-sm leading-relaxed text-[var(--muted-foreground)]">
              {hire.delivery}
            </p>
          </div>
        </Container>
      </Section>

      {/* ---- CTA ------------------------------------------------------------ */}
      <Section dark size="md">
        <Container>
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
            <div>
              <Eyebrow>Book a vehicle</Eyebrow>
              <h2 className="mt-5 text-[clamp(2rem,4vw,3rem)] leading-[1.06]">
                Hire is arranged by phone
              </h2>
              <p className="mt-5 leading-relaxed text-bone/60">
                Availability changes daily and the right vehicle depends on how
                long you need it and what for — so we handle hire directly rather
                than through a booking form that can&rsquo;t see the diary.
              </p>
              <p className="mt-4 leading-relaxed text-bone/60">
                Call before 4pm and same-day collection is usually possible.
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <ExternalButtonLink href={site.phone.href} size="lg">
                  <Phone className="size-4" />
                  {site.phone.display}
                </ExternalButtonLink>
                <ExternalButtonLink
                  href={whatsappLinks.hire}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="whatsapp"
                  size="lg"
                >
                  <WhatsAppIcon className="size-4" />
                  WhatsApp us
                </ExternalButtonLink>
              </div>
            </div>

            <dl className="grid gap-px self-start bg-bone/12">
              <div className="bg-ink-950 p-7">
                <dt className="font-roman text-[0.5625rem] uppercase tracking-[0.18em] text-bone/50">
                  Indicative daily rate
                </dt>
                <dd className="mt-2">
                  <span data-numeric className="font-display text-3xl text-bone">
                    {hire.indicativeDailyRange}
                  </span>
                  <span className="mt-2 block text-xs text-bone/60">
                    A guide only — confirm the rate for your dates with us.
                  </span>
                </dd>
              </div>
              <div className="bg-ink-950 p-7">
                <dt className="font-roman text-[0.5625rem] uppercase tracking-[0.18em] text-bone/50">
                  Collection
                </dt>
                <dd className="mt-2 leading-relaxed text-bone/75">
                  {site.address.full}
                  <br />
                  <span className="text-bone/50">
                    Free parking on site · Mon–Sat 9–6, Sun 10–4
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </Container>
      </Section>

      {/* ---- FAQs ----------------------------------------------------------- */}
      <Section size="md">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-20">
            <div>
              <Eyebrow>Common questions</Eyebrow>
              <h2 className="mt-5 text-[clamp(1.75rem,3.4vw,2.5rem)] leading-tight">
                Hire questions
              </h2>
            </div>
            <FaqList faqs={hireFaqs} />
          </div>
        </Container>
      </Section>
    </>
  );
}
