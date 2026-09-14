import type { Metadata } from "next";
import { Phone } from "lucide-react";

import { FinanceForm } from "@/components/forms/finance-form";
import { PageHero } from "@/components/site/page-hero";
import { ExternalButtonLink } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/icons";
import { JsonLd } from "@/components/ui/json-ld";
import { Container, Eyebrow, Section, SectionHeading } from "@/components/ui/section";
import { financeProducts } from "@/lib/content/services";
import { breadcrumbSchema, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { whatsappLinks } from "@/lib/whatsapp";

/*
 * Broker, lender-panel, approval-speed and credit-check claims were removed
 * from this page, along with the "How it works" broking steps and the finance
 * FAQs that repeated them. The client has no lender panel yet and is still
 * confirming its regulatory status; approved wording must come from its
 * compliance adviser before any of that returns.
 */
export const metadata: Metadata = pageMetadata({
  title: "Car Finance — HP, PCP & Personal Loans",
  description:
    "Hire Purchase, Personal Contract Purchase and personal loans explained plainly, so you can see which might suit you.",
  path: "/finance",
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Finance", path: "/finance" },
];

export default function FinancePage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema(crumbs)} />

      <PageHero
        eyebrow="Finance"
        title="Finance, explained without the fog"
        lede="How Hire Purchase, Personal Contract Purchase and personal loans work, and which might suit you."
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
                Fill in as much as you can, or call or message us instead.
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
    </>
  );
}
