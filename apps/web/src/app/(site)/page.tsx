import type { Metadata } from "next";
import { ArrowRight, MapPin, Phone } from "lucide-react";

import { ClosingCta } from "@/components/home/closing-cta";
import { Hero } from "@/components/home/hero";
import { Spotlight } from "@/components/home/spotlight";
import { ButtonLink, ExternalButtonLink } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/icons";
import { Container, Eyebrow, Section, SectionHeading } from "@/components/ui/section";
import { SplitText } from "@/components/ui/split-text";
import { ExternalTextLink, TextLink } from "@/components/ui/text-link";
import { StockEmptyState } from "@/components/vehicle/listing-promise";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
import { buyingJourney, homeReasons } from "@/lib/content/services";
import { getAvailableVehicles, getFeaturedVehicles } from "@/lib/inventory/repository";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { whatsappLinks } from "@/lib/whatsapp";

export const metadata: Metadata = pageMetadata({
  title: "Sports & Luxury Car Sales in East London",
  description:
    "Car sales in East London from a small family-owned business. Sports and luxury cars at 21–25 Romford Road, Stratford — book a viewing, finance explained, part exchange welcome, nationwide delivery.",
  path: "/",
});

/** Cars shown on the homepage: two rows of four on desktop. */
const STOCK_ON_HOME = 8;

/**
 * The homepage sells the cars.
 *
 * Everything here earns its place by getting someone to a car or to us: the
 * hero, one car in the spotlight, then the stock itself. What follows is
 * deliberately short — a line each on why buy here, how buying works, finance
 * and part exchange, and where we are — because the pages behind those links
 * carry the detail. Long explanations on the way to the cars only lose people.
 */
export default async function HomePage() {
  const [featured, available] = await Promise.all([
    getFeaturedVehicles(STOCK_ON_HOME + 1),
    getAvailableVehicles(),
  ]);

  // One hand-picked car takes the spotlight: the next one after those the hero
  // shows, or the first when there are only a few.
  const spotlight = featured[3] ?? featured[0] ?? null;
  const others = available.filter((vehicle) => vehicle.id !== spotlight?.id);
  // Hand-picked cars lead the grid; the rest is topped up from stock so the
  // homepage never shows a half-empty row while there are cars for sale.
  const row = [
    ...featured.filter((vehicle) => vehicle.id !== spotlight?.id),
    ...others.filter((vehicle) => !featured.some((pick) => pick.id === vehicle.id)),
  ].slice(0, STOCK_ON_HOME);

  const closingCar = featured[1] ?? featured[0] ?? available[0];

  return (
    <>
      <Hero />

      {/* ---- The stock ------------------------------------------------------- */}
      <Section size="md">
        <Container>
          {row.length > 0 ? (
            <>
              <SectionHeading
                eyebrow="Current stock"
                title={[{ text: "On the floor" }, { text: "right now", tone: "muted" }]}
                action={<TextLink href="/vehicles">View all vehicles</TextLink>}
              />

              {/* Swiped sideways on phones (bleeding to the screen edge, the
                  next car peeking in), a grid from tablet up. */}
              <div className="-mx-5 mt-12 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-4 xl:gap-5">
                {row.map((vehicle) => (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    // Below the hero on every viewport; the hero photograph is the LCP.
                    sizes="(min-width: 1280px) 22vw, (min-width: 640px) 45vw, 82vw"
                    className="reveal w-[82%] shrink-0 snap-start sm:w-auto"
                  />
                ))}
              </div>

              <div className="reveal mt-12 flex flex-col items-start gap-5 border-t border-[var(--border)] pt-8 sm:flex-row sm:items-center sm:justify-between">
                <ButtonLink href="/vehicles" size="lg" className="w-full sm:w-auto">
                  View all {available.length} {available.length === 1 ? "car" : "cars"}
                  <ArrowRight />
                </ButtonLink>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Not listed?{" "}
                  <ExternalTextLink
                    href={whatsappLinks.sourcing}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--foreground)]"
                  >
                    Tell us what you&rsquo;re after
                  </ExternalTextLink>
                  .
                </p>
              </div>
            </>
          ) : (
            // Nothing for sale: the panel explains why and points at a person.
            <StockEmptyState showBrowse={available.length > 0} />
          )}
        </Container>
      </Section>

      {/* ---- One car, in full: a break between the grid and the rest --------- */}
      {spotlight ? <Spotlight vehicle={spotlight} /> : null}

      {/* ---- Why here, and how it works -------------------------------------- */}
      <Section tinted size="md">
        <Container>
          <ul className="grid gap-px border border-[var(--border)] bg-[var(--border)] sm:grid-cols-3">
            {homeReasons.map((reason) => (
              <li key={reason.title} className="reveal bg-[var(--background)] p-7 md:p-9">
                <h2 className="font-display text-xl leading-snug md:text-2xl">{reason.title}</h2>
                <p className="mt-2.5 text-sm leading-relaxed text-[var(--muted-foreground)]">{reason.detail}</p>
              </li>
            ))}
          </ul>

          {/* Four steps, four words each: the shape of a sale, not a guide. */}
          <ol className="reveal mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            {buyingJourney.map((step, index) => (
              <li key={step.label} className="border-t border-[var(--border-strong)] pt-4">
                <span aria-hidden data-numeric className="font-roman text-[0.625rem] tracking-[0.22em] text-[var(--accent-text)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 font-display text-lg">{step.label}</h3>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">{step.title}</p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* ---- Finance and part exchange ---------------------------------------- */}
      <Section size="md">
        <Container>
          <div className="grid gap-px border border-[var(--border)] bg-[var(--border)] lg:grid-cols-2">
            <div className="reveal bg-[var(--background)] p-8 md:p-11">
              <Eyebrow>Finance</Eyebrow>
              <h2 className="mt-5 font-display text-[clamp(1.6rem,2.6vw,2.25rem)] leading-tight">
                Spread the cost
              </h2>
              <p className="mt-4 max-w-md leading-relaxed text-[var(--muted-foreground)]">
                Hire Purchase, PCP and personal loans, explained plainly before you commit to anything.
              </p>
              <ButtonLink href="/finance" size="md" className="mt-7">
                Explore finance
                <ArrowRight />
              </ButtonLink>
            </div>

            <div className="reveal bg-[var(--background)] p-8 md:p-11">
              <Eyebrow>Part exchange</Eyebrow>
              <h2 className="mt-5 font-display text-[clamp(1.6rem,2.6vw,2.25rem)] leading-tight">
                Bring your current car
              </h2>
              <p className="mt-4 max-w-md leading-relaxed text-[var(--muted-foreground)]">
                Send us its details and we&rsquo;ll usually come back within 24 hours on weekdays. No obligation.
              </p>
              <ButtonLink href="/part-exchange" size="md" className="mt-7">
                Value your car
                <ArrowRight />
              </ButtonLink>
            </div>
          </div>
        </Container>
      </Section>

      {/* ---- The dealership, in their own words ------------------------------- */}
      <Section dark size="md" className="relative overflow-hidden">
        <Container className="relative">
          <div className="mx-auto max-w-4xl text-center">
            {/* The client's own words, approved in the intake: "don't touch it". */}
            <blockquote>
              <SplitText
                as="p"
                runs="“We’re a small, independent showroom and we like it that way. We won’t put something on the forecourt we wouldn’t be happy to drive ourselves.”"
                className="font-display text-[clamp(1.65rem,3.2vw,2.6rem)] leading-[1.2] tracking-[-0.015em]"
              />
            </blockquote>
            <ButtonLink href="/about" variant="outline" size="md" className="reveal mt-10">
              More about us
              <ArrowRight />
            </ButtonLink>
          </div>
        </Container>
      </Section>

      {/* ---- Where we are ----------------------------------------------------- */}
      <Section size="md">
        <Container>
          <div className="reveal flex flex-col gap-8 border-t border-[var(--border-strong)] pt-10 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Eyebrow>The showroom</Eyebrow>
              <p className="mt-4 flex items-start gap-2.5 font-display text-2xl leading-snug md:text-3xl">
                <MapPin className="mt-1.5 size-5 shrink-0 text-[var(--accent-text)]" />
                {site.address.full}
              </p>
              <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                {site.hours.compact} · {site.parking}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/contact#book-a-viewing" size="md">
                Book a viewing
                <ArrowRight />
              </ButtonLink>
              <ExternalButtonLink href={site.phone.href} variant="outline" size="md">
                <Phone className="size-4" />
                {site.phone.display}
              </ExternalButtonLink>
              <ExternalButtonLink
                href={whatsappLinks.general}
                target="_blank"
                rel="noopener noreferrer"
                variant="whatsapp"
                size="md"
              >
                <WhatsAppIcon className="size-4" />
                WhatsApp
              </ExternalButtonLink>
            </div>
          </div>
        </Container>
      </Section>

      {/* ---- Closing call to action -------------------------------------------- */}
      <ClosingCta photo={closingCar?.cover} />
    </>
  );
}
