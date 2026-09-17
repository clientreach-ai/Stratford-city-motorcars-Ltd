import type { Metadata } from "next";
import { Suspense } from "react";
import { Phone } from "lucide-react";

import { FinanceForm } from "@/components/forms/finance-form";
import { FaqSection } from "@/components/site/faq-section";
import { PageHero } from "@/components/site/page-hero";
import { ButtonLink, ExternalButtonLink } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/icons";
import { JsonLd } from "@/components/ui/json-ld";
import { Container, Eyebrow, Section, SectionHeading } from "@/components/ui/section";
import { faqsByCategory } from "@/lib/content/faqs";
import { financeProducts, financeTerms, paymentMethods } from "@/lib/content/services";
import { resolveVehicleBySlug } from "@/lib/inventory/repository";
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
  title: "Car Finance Explained — HP, PCP & Personal Loans",
  description:
    "Hire Purchase, Personal Contract Purchase and personal loans explained plainly, from a family-owned sports and luxury car business in Stratford, East London.",
  path: "/finance",
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Finance", path: "/finance" },
];

export default function FinancePage(props: PageProps<"/finance">) {
  return (
    <>
      <JsonLd data={breadcrumbSchema(crumbs)} />

      <PageHero
        eyebrow="Finance"
        title="Finance, explained without the fog"
        lede="Finance is one of the ways you can pay for your next car. Here's how Hire Purchase, Personal Contract Purchase and personal loans work, the terms you'll meet in any quote, and how to start a conversation with us about it."
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

      {/* ---- At a glance ----------------------------------------------------- */}
      <Section tinted size="md">
        <Container>
          <SectionHeading eyebrow="At a glance" title="How the three compare" />

          {/* Focusable so keyboard users can scroll the table sideways on a phone. */}
          <div
            role="region"
            aria-label="Finance options compared"
            tabIndex={0}
            className="mt-12 overflow-x-auto border border-[var(--border)] bg-[var(--background)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--ring)]"
          >
            <table className="w-full min-w-[44rem] text-left text-sm">
              <caption className="sr-only">Hire Purchase, Personal Contract Purchase and personal loans compared</caption>
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th scope="col" className="w-44 p-5 font-normal text-[var(--muted-foreground)]">
                    <span className="sr-only">Question</span>
                  </th>
                  {financeProducts.map((product) => (
                    <th key={product.key} scope="col" className="p-5 align-bottom">
                      <span className="block font-roman text-[0.5625rem] uppercase tracking-[0.2em] text-[var(--rule)]">
                        {product.abbreviation}
                      </span>
                      <span className="mt-1.5 block font-display text-lg font-normal">{product.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {comparisonRows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="p-5 align-top font-medium">
                      {row.label}
                    </th>
                    {financeProducts.map((product) => (
                      <td key={product.key} className="p-5 align-top leading-relaxed text-[var(--muted-foreground)]">
                        {row.value(product)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </Section>

      {/* ---- The terms ------------------------------------------------------- */}
      <Section size="md">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-20">
            <div>
              <Eyebrow>Plain English</Eyebrow>
              <h2 className="mt-5 text-[clamp(1.85rem,3.6vw,2.6rem)] leading-tight">The terms you&rsquo;ll see in any quote</h2>
              <p className="mt-5 leading-relaxed text-[var(--muted-foreground)]">
                Monthly figures depend on the car, your deposit, the term and the lender, so we don&rsquo;t quote
                them here. These are the moving parts behind every one.
              </p>
            </div>
            <dl className="grid gap-px border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2">
              {financeTerms.map((term) => (
                <div key={term.title} className="bg-[var(--background)] p-7">
                  <dt className="font-display text-xl">{term.title}</dt>
                  <dd className="mt-2.5 text-sm leading-relaxed text-[var(--muted-foreground)]">{term.detail}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Container>
      </Section>

      {/* ---- How an enquiry works -------------------------------------------- */}
      <Section dark size="md">
        <Container>
          <SectionHeading eyebrow="Talking to us about finance" title="How a finance enquiry works" />
          <ol className="mt-12 grid gap-px border border-bone/12 bg-bone/12 md:grid-cols-3">
            {enquirySteps.map((step, index) => (
              <li key={step.title} className="bg-ink-950 p-7 md:p-8">
                <span aria-hidden data-numeric className="font-display text-4xl leading-none text-bone/50">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-5 font-display text-xl leading-snug">{step.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-bone/65">{step.detail}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-col gap-3 border-t border-bone/12 pt-6 text-sm md:flex-row md:items-baseline md:gap-8">
            <h3 className="shrink-0 font-roman text-[0.625rem] uppercase tracking-[0.22em] text-brass">
              Other ways to pay
            </h3>
            <p className="leading-relaxed text-bone/65">{paymentMethods.join(" · ")}</p>
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
                Tell us the car you&rsquo;re interested in and roughly what you&rsquo;d like to pay. Sending this
                form doesn&rsquo;t run a credit check. Prefer to talk? Call or message us instead.
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
              <Suspense fallback={<FinanceForm />}>
                <FinanceFormForLinkedCar searchParams={props.searchParams} />
              </Suspense>
            </div>
          </div>
        </Container>
      </Section>

      <FaqSection
        faqs={faqsByCategory("Finance")}
        eyebrow="Finance questions"
        title="Before you ask"
        footer={
          <ButtonLink href="/part-exchange" variant="outline" size="md">
            Value your part exchange
          </ButtonLink>
        }
      />
    </>
  );
}

/**
 * The car comes from `?vehicle=` on a car's finance link, looked up in stock:
 * a slug we do not hold prefills nothing, rather than a title made up from the
 * URL. Reading the query renders this part of the page per request, so it sits
 * inside <Suspense> with the empty form as its fallback.
 */
async function FinanceFormForLinkedCar({
  searchParams,
}: {
  searchParams: PageProps<"/finance">["searchParams"];
}) {
  const { vehicle } = await searchParams;
  const car = await resolveVehicleBySlug(Array.isArray(vehicle) ? vehicle[0] : vehicle);
  if (!car) return <FinanceForm />;
  return <FinanceForm vehicleSlug={car.slug} vehicleName={`${car.year} ${car.title}`} />;
}

const comparisonRows: { label: string; value: (product: (typeof financeProducts)[number]) => string }[] = [
  {
    label: "Monthly payments",
    value: (product) =>
      ({
        hp: "Fixed across the term, covering the full amount borrowed.",
        pcp: "Lower than HP, because part of the car's value is deferred to the end.",
        loan: "Repaid to the lender, separately from the car.",
      })[product.key] ?? "",
  },
  {
    label: "Deposit",
    value: (product) =>
      product.key === "loan"
        ? "Optional — put some money down and borrow less."
        : "Paid at the start. A part exchange can count towards it.",
  },
  { label: "Best for", value: (product) => product.bestFor },
];

const enquirySteps = [
  {
    title: "Tell us what you're after",
    detail:
      "The car you're interested in, a rough budget and whether you have a part exchange. Use the form below, call or WhatsApp.",
  },
  {
    title: "We talk it through",
    detail:
      "We'll come back to you personally to go over the options for that car and answer any questions about how they work.",
  },
  {
    title: "You decide",
    detail:
      "Nothing is applied for without your say-so. If finance isn't right for you, there are plenty of other ways to pay.",
  },
];
