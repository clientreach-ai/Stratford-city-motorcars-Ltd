import type { Metadata } from "next";
import { Phone } from "lucide-react";

import { FinanceForm } from "@/components/forms/finance-form";
import { FaqList } from "@/components/site/faq-list";
import { PageHero } from "@/components/site/page-hero";
import { ExternalButtonLink } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/icons";
import { JsonLd } from "@/components/ui/json-ld";
import { Container, Eyebrow, Section, SectionHeading } from "@/components/ui/section";
import { faqsByCategory } from "@/lib/content/faqs";
import { financeProducts, financeSteps } from "@/lib/content/services";
import { breadcrumbSchema, faqSchema, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { whatsappLinks } from "@/lib/whatsapp";

export const metadata: Metadata = pageMetadata({
  title: "Car Finance — HP, PCP & Personal Loans",
  description:
    "Car finance through FCA-regulated lenders. Hire Purchase, PCP and personal loans explained plainly. We are a credit broker, not a lender.",
  path: "/finance",
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Finance", path: "/finance" },
];

export default function FinancePage() {
  const financeFaqs = faqsByCategory("Finance");

  return (
    <>
      <JsonLd data={[breadcrumbSchema(crumbs), faqSchema(financeFaqs)]} />

      <PageHero
        eyebrow="Finance"
        title="Finance, explained without the fog"
        lede="We're a credit broker, not a lender. That means we take your circumstances to several FCA-regulated finance houses and come back with what is genuinely available — set out in full, not just as a monthly figure."
        crumbs={crumbs}
      />

      {/* ---- The three products ------------------------------------------- */}
      <Section size="md">
        <Container>
          <SectionHeading
            eyebrow="Your options"
            title="Three ways to fund a car"
            lede="Which one suits you depends on whether you want to own the car outright, keep the monthly payment down, or keep your options open at the end."
          />

          {/*
            Subgrid: the five bands (abbreviation, name, summary, points,
            ownership) share row heights across all three columns, so the
            labels line up however long the copy runs. Rows are auto-sized —
            `grid-rows-5` would split the height into five equal bands and
            stretch everything apart.
          */}
          <div className="mt-14 grid gap-px bg-[var(--border)] lg:grid-cols-3 lg:grid-rows-[repeat(5,auto)] lg:gap-y-0">
            {financeProducts.map((product) => (
              <article
                key={product.key}
                className="reveal flex flex-col bg-[var(--background)] p-7 md:p-9 lg:row-span-5 lg:grid lg:grid-rows-subgrid"
              >
                <span className="font-roman text-[0.625rem] uppercase tracking-[0.22em] text-[var(--rule)]">
                  {product.abbreviation}
                </span>
                <h3 className="mt-4 font-display text-2xl leading-tight md:text-[1.75rem]">
                  {product.name}
                </h3>
                <p className="mt-4 leading-relaxed text-[var(--muted-foreground)]">
                  {product.summary}
                </p>

                <ul className="mt-6 space-y-2.5 border-t border-[var(--border)] pt-6">
                  {product.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-2.5 text-sm text-[var(--muted-foreground)]"
                    >
                      <span aria-hidden className="mt-2 size-1 shrink-0 bg-[var(--rule)]" />
                      {point}
                    </li>
                  ))}
                </ul>

                <dl className="mt-auto space-y-4 border-t border-[var(--border)] pt-6 text-sm lg:mt-0 lg:self-start">
                  <div>
                    <dt className="font-roman text-[0.5625rem] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                      Ownership
                    </dt>
                    <dd className="mt-1 leading-relaxed">{product.ownership}</dd>
                  </div>
                  <div>
                    <dt className="font-roman text-[0.5625rem] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                      At the end of the term
                    </dt>
                    <dd className="mt-1 leading-relaxed">{product.endOfTerm}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </Container>
      </Section>

      {/* ---- How it works -------------------------------------------------- */}
      <Section dark size="md">
        <Container>
          <div className="grid gap-14 lg:grid-cols-[minmax(0,24rem)_1fr] lg:gap-20">
            <div>
              <Eyebrow>How it works</Eyebrow>
              <h2 className="mt-5 text-[clamp(2rem,4vw,3rem)] leading-[1.06]">
                Four steps, no surprises
              </h2>
              <p className="mt-5 leading-relaxed text-bone/60">
                Nothing is committed until you sign. If the numbers don&rsquo;t
                work for you, we&rsquo;ll tell you rather than stretch the term
                until the monthly figure looks acceptable.
              </p>
            </div>

            <ol className="space-y-0">
              {financeSteps.map((step, index) => (
                <li
                  key={step.title}
                  className="reveal flex gap-6 border-b border-bone/12 py-7 first:border-t"
                >
                  <span
                    aria-hidden
                    data-numeric
                    className="shrink-0 font-display text-sm text-brass"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="font-display text-xl leading-snug">
                      {step.title}
                    </h3>
                    <p className="mt-2 leading-relaxed text-bone/60">
                      {step.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </Section>

      {/* ---- The form ------------------------------------------------------ */}
      <Section tinted size="md">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:gap-20">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <Eyebrow>Get started</Eyebrow>
              <h2 className="mt-5 text-[clamp(2rem,4vw,2.75rem)] leading-[1.08]">
                Tell us what works for you
              </h2>
              <p className="mt-5 max-w-lg leading-relaxed text-[var(--muted-foreground)]">
                Fill in as much as you can. Nothing here runs a credit check —
                we&rsquo;ll always tell you before anything touches your file.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <ExternalButtonLink href={site.phone.href} variant="outline" size="md">
                  <Phone className="size-4" />
                  {site.phone.display}
                </ExternalButtonLink>
                <ExternalButtonLink
                  href={whatsappLinks.finance}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="whatsapp"
                  size="md"
                >
                  <WhatsAppIcon className="size-4" />
                  Ask on WhatsApp
                </ExternalButtonLink>
              </div>
            </div>

            <div className="border border-[var(--border)] bg-[var(--background)] p-6 md:p-9">
              <FinanceForm />
            </div>
          </div>
        </Container>
      </Section>

      {/* ---- FAQs ---------------------------------------------------------- */}
      <Section size="md">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-20">
            <div>
              <Eyebrow>Common questions</Eyebrow>
              <h2 className="mt-5 text-[clamp(1.75rem,3.4vw,2.5rem)] leading-tight">
                Finance questions
              </h2>
            </div>
            <FaqList faqs={financeFaqs} />
          </div>

          <p className="mt-12 max-w-3xl border-l border-[var(--rule)] pl-5 text-xs leading-relaxed text-[var(--muted-foreground)]">
            {site.compliance.creditBroker} {site.compliance.financeSubjectToStatus}{" "}
            We do not provide financial advice — if you are unsure which product
            suits your circumstances, consider speaking to an independent
            financial adviser.
          </p>
        </Container>
      </Section>
    </>
  );
}
