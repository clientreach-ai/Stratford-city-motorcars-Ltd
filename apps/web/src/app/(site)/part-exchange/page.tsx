import type { Metadata } from "next";
import { Check, Phone } from "lucide-react";

import { PartExchangeForm } from "@/components/forms/part-exchange-form";
import { PageHero } from "@/components/site/page-hero";
import { ExternalButtonLink } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/icons";
import { JsonLd } from "@/components/ui/json-ld";
import { Container, Eyebrow, Section, SectionHeading } from "@/components/ui/section";
import { partExchangeChecklist, partExchangeSteps } from "@/lib/content/services";
import { breadcrumbSchema, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { whatsappLinks } from "@/lib/whatsapp";

export const metadata: Metadata = pageMetadata({
  title: "Part Exchange — Free Car Valuation",
  description:
    "Put your current car towards your next one. Tell us about it and we'll come back within 24 hours with an initial valuation, confirmed on inspection.",
  path: "/part-exchange",
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Part Exchange", path: "/part-exchange" },
];

export default function PartExchangePage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema(crumbs)} />

      <PageHero
        eyebrow="Part exchange"
        title="Your current car can do most of the work"
        lede="Tell us what you're driving and we'll come back within 24 hours with a realistic figure. When you bring it in we confirm that valuation — we don't quietly revise it downwards and put the difference on the new car."
        crumbs={crumbs}
      />

      {/* ---- Steps --------------------------------------------------------- */}
      <Section size="md">
        <Container>
          <SectionHeading
            eyebrow="How it works"
            title="Four steps from your car to ours"
          />

          <ol className="mt-14 grid gap-px bg-[var(--border)] md:grid-cols-2 xl:grid-cols-4">
            {partExchangeSteps.map((step, index) => (
              <li
                key={step.title}
                className="reveal bg-[var(--background)] p-7 md:p-8"
              >
                <span
                  aria-hidden
                  data-numeric
                  className="font-display text-4xl leading-none text-ink-500"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-5 font-display text-lg leading-snug">
                  {step.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-[var(--muted-foreground)]">
                  {step.detail}
                </p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* ---- Form + checklist ---------------------------------------------- */}
      <Section tinted size="md">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-20">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <Eyebrow>What we need</Eyebrow>
              <h2 className="mt-5 text-[clamp(1.75rem,3.4vw,2.5rem)] leading-tight">
                Six things, two minutes
              </h2>

              <ul className="mt-8 space-y-3.5">
                {partExchangeChecklist.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <Check
                      aria-hidden
                      className="mt-0.5 size-4 shrink-0 text-[var(--rule)]"
                    />
                    {item}
                  </li>
                ))}
              </ul>

              <p className="mt-8 text-sm leading-relaxed text-[var(--muted-foreground)]">
                Being straight with us about condition means the figure we give
                you is the figure you get. Surprises on inspection help nobody.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <ExternalButtonLink href={site.phone.href} variant="outline" size="md">
                  <Phone className="size-4" />
                  {site.phone.display}
                </ExternalButtonLink>
                <ExternalButtonLink
                  href={whatsappLinks.partExchange}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="whatsapp"
                  size="md"
                >
                  <WhatsAppIcon className="size-4" />
                  Send photos
                </ExternalButtonLink>
              </div>
            </div>

            <div className="border border-[var(--border)] bg-[var(--background)] p-6 md:p-9">
              <PartExchangeForm />
            </div>
          </div>
        </Container>
      </Section>

      {/* ---- What happens next --------------------------------------------- */}
      <Section dark size="md">
        <Container>
          <div className="max-w-3xl">
            <Eyebrow>After you send it</Eyebrow>
            <h2 className="mt-5 text-[clamp(2rem,4vw,3rem)] leading-[1.06]">
              What happens next
            </h2>

            <div className="mt-10 space-y-8">
              <NextStep
                title="Within 24 hours"
                detail="We come back by phone or email with an initial figure based on what you've told us, and what the car is genuinely worth to us at that mileage and condition."
              />
              <NextStep
                title="When you bring it in"
                detail="A short inspection and a look at the documents. This is where the valuation is confirmed — it takes about twenty minutes and there's free parking on site."
              />
              <NextStep
                title="If you go ahead"
                detail="The agreed value comes straight off the price of your next car, or goes towards your finance deposit. If there's outstanding finance we settle it directly with your lender."
              />
              <NextStep
                title="If you don't"
                detail="Nothing happens. There's no obligation at any point, and we won't chase you."
              />
            </div>

            <p className="mt-12 border-l border-brass pl-5 text-xs leading-relaxed text-bone/55">
              {site.compliance.partExchangeSubjectToInspection} Vehicles must have
              a valid MOT and be roadworthy. Outstanding finance must be disclosed
              and settled. We reserve the right to decline a part exchange.
            </p>
          </div>
        </Container>
      </Section>
    </>
  );
}

function NextStep({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="reveal border-t border-bone/12 pt-6">
      <h3 className="font-roman text-[0.625rem] uppercase tracking-[0.22em] text-brass">
        {title}
      </h3>
      <p className="mt-3 leading-relaxed text-bone/70">{detail}</p>
    </div>
  );
}
