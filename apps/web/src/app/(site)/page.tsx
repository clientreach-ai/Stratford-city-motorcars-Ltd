import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";

import { Hero } from "@/components/home/hero";
import { ShowroomPanel } from "@/components/site/showroom-panel";
import { ButtonLink, ExternalButtonLink } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/icons";
import { Container, Eyebrow, Section, SectionHeading } from "@/components/ui/section";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
import { buyingFacts, financeProducts, partExchangeSteps } from "@/lib/content/services";
import { getFeaturedVehicles } from "@/lib/inventory/repository";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { whatsappLinks } from "@/lib/whatsapp";

export const metadata: Metadata = pageMetadata({
  title: "Sports & Luxury Car Sales in East London",
  description:
    "Sports and luxury car sales in Stratford, East London, from a small family-owned business. Browse stock, book a viewing, finance explained, part exchange welcome.",
  path: "/",
});

export default async function HomePage() {
  const featured = await getFeaturedVehicles(4);

  return (
    <>
      <Hero />

      {/* ---- Featured stock ------------------------------------------------ */}
      <Section size="md">
        <Container>
          {featured.length > 0 ? (
            <>
              <SectionHeading
                eyebrow="Current stock"
                title="On the floor right now"
                lede="Hand-picked from our current stock. Take your time, and ask us anything you'd like to know."
                action={
                  <Link
                    href="/vehicles"
                    className="group inline-flex items-center gap-2.5 border-b border-[var(--rule)] pb-1 text-sm transition-colors hover:text-[var(--rule)]"
                  >
                    View all vehicles
                    <ArrowRight className="size-4 transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:translate-x-1" />
                  </Link>
                }
              />

              <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {featured.map((vehicle, index) => (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    // Below the hero on every viewport; the headline is the LCP.
                    sizes="(min-width: 1280px) 22vw, (min-width: 640px) 45vw, 92vw"
                    className="reveal"
                  />
                ))}
              </div>
            </>
          ) : (
            // Nothing hand-picked: no grid and no "on the floor" claim. Other
            // stock is deliberately not promoted here to fill the space.
            <SectionHeading eyebrow="Current stock" title="Tell us what you're looking for" />
          )}

          <p className="mt-8 text-sm text-[var(--muted-foreground)]">
            Stock moves and we don&rsquo;t list everything online.{" "}
            <a
              href={whatsappLinks.sourcing}
              target="_blank"
              rel="noopener noreferrer"
              className="border-b border-[var(--rule)] pb-0.5 transition-colors hover:text-[var(--rule)]"
            >
              Tell us what you&rsquo;re looking for
            </a>{" "}
            and we&rsquo;ll let you know when something lands.
          </p>
        </Container>
      </Section>

      {/* ---- Buying from us ------------------------------------------------ */}
      <Section size="sm" className="border-t border-[var(--border)]">
        <Container>
          <h2 className="sr-only">Buying from us</h2>
          <ul className="grid gap-10 md:grid-cols-3 md:gap-12">
            {buyingFacts.map((fact) => (
              <li key={fact.title} className="reveal">
                <h3 className="font-display text-xl leading-snug">{fact.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-[var(--muted-foreground)]">{fact.detail}</p>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* ---- Finance ------------------------------------------------------- */}
      {/* Band order alternates plain / tinted between the dark hero and the
          dark closing CTA: stock, finance (tinted), part exchange, showroom
          (tinted). */}
      <Section tinted size="md">
        <Container>
          <div className="grid gap-14 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-20">
            <div className="lg:sticky lg:top-32 lg:self-start">
              <Eyebrow>Finance</Eyebrow>
              <h2 className="mt-5 text-[clamp(2rem,4vw,3rem)] leading-[1.06]">
                Spread the cost, without the fog
              </h2>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/finance" size="md">
                  Explore finance
                </ButtonLink>
                <ExternalButtonLink
                  href={whatsappLinks.finance}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outline"
                  size="md"
                >
                  <WhatsAppIcon className="size-4" />
                  Ask a question
                </ExternalButtonLink>
              </div>
            </div>

            <ul className="grid gap-px bg-[var(--border)]">
              {financeProducts.map((product) => (
                <li
                  key={product.key}
                  className="reveal bg-[var(--background)] p-7 md:p-8"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h3 className="font-display text-2xl">{product.name}</h3>
                    <span className="font-roman text-[0.625rem] uppercase tracking-[0.2em] text-[var(--rule)]">
                      {product.abbreviation}
                    </span>
                  </div>
                  <p className="mt-3 leading-relaxed text-[var(--muted-foreground)]">
                    {product.summary}
                  </p>
                  <p className="mt-4 text-sm">
                    <span className="text-[var(--muted-foreground)]">Best for </span>
                    {product.bestFor}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </Section>

      {/* ---- Part exchange -------------------------------------------------- */}
      <Section size="md">
        <Container>
          <SectionHeading
            eyebrow="Part exchange"
            title="Your current car can do most of the work"
            lede="Tell us about it and we'll usually come back within 24 hours on weekdays with an initial figure, confirmed once we've seen the car."
            action={
              <ButtonLink href="/part-exchange" size="md">
                Value your car
              </ButtonLink>
            }
          />

          <ol className="mt-14 grid gap-px bg-[var(--border)] md:grid-cols-2 lg:grid-cols-4">
            {partExchangeSteps.map((step, index) => (
              <li
                key={step.title}
                className="reveal bg-[var(--surface)] p-7 md:p-8"
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

          <p className="mt-8 text-xs text-[var(--muted-foreground)]">
            {site.compliance.partExchangeSubjectToInspection}
          </p>
        </Container>
      </Section>

      {/* ---- Showroom ------------------------------------------------------- */}
      <Section tinted size="md">
        <Container>
          <SectionHeading
            eyebrow="The showroom"
            title="Come and see us in Stratford"
            lede="We're on Romford Road with free parking on site, a short walk from Stratford station. Call ahead and we'll have the car you want to see ready and waiting."
          />
          <div className="mt-14">
            <ShowroomPanel />
          </div>
        </Container>
      </Section>

      {/* ---- Closing CTA ---------------------------------------------------- */}
      <Section dark size="lg">
        <Container className="text-center">
          <Eyebrow className="justify-center">Ready when you are</Eyebrow>
          <h2 className="mx-auto mt-6 max-w-3xl text-[clamp(2.4rem,6vw,4.25rem)] leading-[1.02]">
            Find your next car.
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-bone/60">
            Browse the stock, or just tell us what you&rsquo;re after and let us do
            the looking.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/vehicles" size="lg">
              View our stock
            </ButtonLink>
            <ButtonLink href="/contact" variant="outline" size="lg">
              Contact us
            </ButtonLink>
            <ExternalButtonLink
              href={whatsappLinks.browsing}
              target="_blank"
              rel="noopener noreferrer"
              variant="whatsapp"
              size="lg"
            >
              <WhatsAppIcon className="size-4" />
              WhatsApp us
            </ExternalButtonLink>
          </div>

          <p className="mt-10 text-sm text-bone/60">
            Or call{" "}
            <a
              href={site.phone.href}
              className="inline-flex items-center gap-1.5 border-b border-brass pb-0.5 text-bone transition-colors hover:text-brass"
            >
              <Phone className="size-3.5" />
              {site.phone.display}
            </a>
          </p>
        </Container>
      </Section>
    </>
  );
}
