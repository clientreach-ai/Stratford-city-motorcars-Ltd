import type { Metadata } from "next";
import { ArrowRight, Phone } from "lucide-react";

import { ClosingCta } from "@/components/home/closing-cta";
import { Hero } from "@/components/home/hero";
import { Spotlight } from "@/components/home/spotlight";
import { BuyingJourney } from "@/components/site/buying-journey";
import { FaqSection } from "@/components/site/faq-section";
import { ShowroomPanel } from "@/components/site/showroom-panel";
import { ButtonLink, ExternalButtonLink } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/icons";
import { Container, Eyebrow, Section, SectionHeading } from "@/components/ui/section";
import { SplitText } from "@/components/ui/split-text";
import { ExternalTextLink, TextLink } from "@/components/ui/text-link";
import { StockEmptyState } from "@/components/vehicle/listing-promise";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
import { VehiclePhoto } from "@/components/vehicle/vehicle-photo";
import { homeFaqs } from "@/lib/content/faqs";
import { financeProducts, financeTerms, partExchangeSteps, whyBuyHere } from "@/lib/content/services";
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

/** One row of cars on the homepage: four across on desktop. */
const STOCK_ROW = 4;

export default async function HomePage() {
  const [featured, available] = await Promise.all([getFeaturedVehicles(STOCK_ROW + 1), getAvailableVehicles()]);

  // One hand-picked car takes the spotlight: the next one after those the hero
  // shows, or the first when there are only a few.
  const spotlight = featured[3] ?? featured[0] ?? null;
  const others = available.filter((vehicle) => vehicle.id !== spotlight?.id);
  // Hand-picked cars lead the row; the rest is topped up from stock so the
  // homepage never shows a half-empty row while there are cars for sale.
  const row = [
    ...featured.filter((vehicle) => vehicle.id !== spotlight?.id),
    ...others.filter((vehicle) => !featured.some((pick) => pick.id === vehicle.id)),
  ].slice(0, STOCK_ROW);

  // Atmosphere for the About band and the closing call to action, from the
  // dealership's own photographs — never stock imagery.
  const interior = (spotlight ?? available[0])?.images.find((image) => image.category === "interior");
  const closingCar = featured[1] ?? featured[0] ?? available[0];

  return (
    <>
      <Hero />

      {/* ---- Featured car ---------------------------------------------------- */}
      {spotlight ? <Spotlight vehicle={spotlight} /> : null}

      {/* ---- Current stock ------------------------------------------------ */}
      <Section size="md">
        <Container>
          {row.length > 0 ? (
            <>
              <SectionHeading
                eyebrow="Current stock"
                title={[{ text: "On the floor" }, { text: "right now", tone: "muted" }]}
                lede="A few of the cars in stock right now. Take your time, and ask us anything you'd like to know."
                action={<TextLink href="/vehicles">View all vehicles</TextLink>}
              />

              {/* One row: swiped sideways on phones (bleeding to the screen
                  edge, the next car peeking in), a grid from tablet up. */}
              <div className="-mx-5 mt-14 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-4 xl:gap-5">
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

              <div className="reveal mt-12 flex flex-col items-start gap-6 border-t border-[var(--border)] pt-8 sm:flex-row sm:items-center sm:justify-between">
                <ButtonLink href="/vehicles" size="lg" className="w-full sm:w-auto">
                  View all {available.length} {available.length === 1 ? "car" : "cars"}
                  <ArrowRight />
                </ButtonLink>
                <p className="text-sm text-[var(--muted-foreground)] sm:max-w-md sm:text-right">
                  Stock moves and we don&rsquo;t list everything online.{" "}
                  <ExternalTextLink href={whatsappLinks.sourcing} target="_blank" rel="noopener noreferrer" className="text-[var(--foreground)]">
                    Tell us what you&rsquo;re looking for
                  </ExternalTextLink>{" "}
                  and we&rsquo;ll let you know what we have.
                </p>
              </div>
            </>
          ) : (
            // Nothing for sale: the panel explains why and points at a person.
            <StockEmptyState showBrowse={available.length > 0} />
          )}
        </Container>
      </Section>

      {/* ---- Why buy from us ------------------------------------------------ */}
      <Section tinted size="md">
        <Container>
          <div className="grid gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
            <div className="lg:sticky lg:top-32 lg:self-start">
              <SectionHeading
                eyebrow="Why Stratford City Motorcars"
                title={[{ text: "An experience," }, { text: "not just a car sale", tone: "muted" }]}
                lede="We're a small family-owned business trading in sports and luxury cars. Here's what that means when you buy from us."
              />
            </div>

            <ol className="border-t border-[var(--border-strong)]">
              {whyBuyHere.map((item, index) => (
                <li
                  key={item.title}
                  className="reveal grid grid-cols-[3rem_1fr] gap-x-4 border-b border-[var(--border)] py-8 md:grid-cols-[4.5rem_1fr] md:py-10"
                >
                  <span aria-hidden data-numeric className="pt-1.5 font-roman text-[0.6875rem] tracking-[0.22em] text-[var(--accent-text)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="font-display text-2xl leading-snug md:text-[1.875rem]">{item.title}</h3>
                    <p className="mt-3 max-w-xl leading-relaxed text-[var(--muted-foreground)]">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </Section>

      {/* ---- How buying works ----------------------------------------------- */}
      <BuyingJourney dark />

      {/* ---- Finance ------------------------------------------------------- */}
      <Section size="md">
        <Container>
          <div className="grid gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
            <div className="lg:sticky lg:top-32 lg:self-start">
              <SectionHeading
                eyebrow="Finance"
                title={[{ text: "Spread the cost," }, { text: "without the fog", tone: "muted" }]}
                lede="Hire Purchase, Personal Contract Purchase and personal loans work in different ways. We explain each one plainly, so you can decide what suits you before you commit to anything."
              />
              <div className="reveal mt-9 flex flex-wrap gap-3">
                <ButtonLink href="/finance" size="md">
                  Explore finance
                  <ArrowRight />
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

            <div>
              <ul className="border-t border-[var(--border-strong)]">
                {financeProducts.map((product) => (
                  <li
                    key={product.key}
                    className="reveal grid gap-x-8 gap-y-3 border-b border-[var(--border)] py-8 md:grid-cols-[7rem_1fr] md:py-10"
                  >
                    <span className="font-display text-4xl leading-none text-[var(--accent-text)] md:text-5xl">
                      {product.abbreviation}
                    </span>
                    <div>
                      <h3 className="font-display text-2xl">{product.name}</h3>
                      <p className="mt-3 leading-relaxed text-[var(--muted-foreground)]">{product.summary}</p>
                      <p className="mt-4 text-sm">
                        <span className="text-[var(--muted-foreground)]">Best for </span>
                        {product.bestFor}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              <h3 className="reveal mt-12 font-roman text-[0.625rem] uppercase tracking-[0.22em] text-[var(--accent-text)]">
                The terms you&rsquo;ll see in any quote
              </h3>
              <dl className="mt-6 grid gap-x-10 gap-y-7 sm:grid-cols-2">
                {financeTerms.map((term) => (
                  <div key={term.title} className="reveal border-t border-[var(--border)] pt-4">
                    <dt className="font-display text-lg">{term.title}</dt>
                    <dd className="mt-1.5 text-sm leading-relaxed text-[var(--muted-foreground)]">{term.detail}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </Container>
      </Section>

      {/* ---- Part exchange -------------------------------------------------- */}
      <Section tinted size="md">
        <Container>
          <div className="grid gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
            <div className="lg:sticky lg:top-32 lg:self-start">
              <SectionHeading
                eyebrow="Part exchange"
                title={[{ text: "Your current car" }, { text: "can do most of the work", tone: "muted" }]}
                lede="Send us its details and we'll usually come back within 24 hours on weekdays with an initial figure, confirmed once we've seen the car. There's no obligation to go ahead."
              />
              <div className="reveal mt-9">
                <ButtonLink href="/part-exchange" size="md">
                  Value your car
                  <ArrowRight />
                </ButtonLink>
              </div>
              <p className="reveal mt-8 max-w-md text-xs leading-relaxed text-[var(--muted-foreground)]">
                {site.compliance.partExchangeSubjectToInspection}
              </p>
            </div>

            <ol className="relative">
              <span aria-hidden className="absolute bottom-6 left-[1.35rem] top-6 w-px bg-[var(--border-strong)] md:left-[1.85rem]" />
              {partExchangeSteps.map((step, index) => (
                <li key={step.title} className="reveal relative grid grid-cols-[2.75rem_1fr] gap-x-5 py-6 md:grid-cols-[3.75rem_1fr] md:gap-x-8">
                  <span
                    aria-hidden
                    data-numeric
                    className="relative flex size-11 items-center justify-center border border-[var(--rule)] bg-[var(--surface)] font-display text-lg md:size-15 md:text-2xl"
                  >
                    {index + 1}
                  </span>
                  <div className="pt-1 md:pt-3">
                    <h3 className="font-display text-xl leading-snug md:text-2xl">{step.title}</h3>
                    <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-[var(--muted-foreground)] md:text-base">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </Section>

      {/* ---- About ------------------------------------------------------------ */}
      <Section dark size="lg" className="relative overflow-hidden">
        <Container className="relative">
          <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-20">
            {interior ? (
              <div className="reveal reveal-image relative aspect-[4/5] overflow-hidden bg-ink-900 sm:aspect-[4/3] lg:aspect-[4/5]">
                <VehiclePhoto
                  image={interior}
                  sizes="(min-width: 1408px) 620px, (min-width: 1024px) 45vw, 100vw"
                  className="object-cover"
                />
              </div>
            ) : null}
            <div className={interior ? undefined : "lg:col-span-2 lg:max-w-4xl"}>
              <Eyebrow className="reveal">About us</Eyebrow>
              {/* The client's own words, approved in the intake: "don't touch it". */}
              <blockquote className="mt-8">
                <SplitText
                  as="p"
                  runs="“We’re a small, independent showroom and we like it that way. We won’t put something on the forecourt we wouldn’t be happy to drive ourselves.”"
                  className="font-display text-[clamp(1.75rem,3.4vw,2.75rem)] leading-[1.2] tracking-[-0.015em]"
                />
              </blockquote>
              <div className="reveal reveal-line mt-10 h-px w-24 bg-brass" aria-hidden />
              <p className="reveal mt-8 max-w-xl leading-relaxed text-bone/70">
                We&rsquo;re a family business, and we&rsquo;d rather you left feeling good about your decision than
                rushed into one. Come in, take your time, look the car over properly and ask whatever you like.
                There&rsquo;s no pressure and no script.
              </p>
              <p className="reveal mt-5 max-w-xl leading-relaxed text-bone/70">
                When you get in touch, you deal with us directly — from the first question to handing over the keys.
              </p>
              <ButtonLink href="/about" variant="outline" size="md" className="reveal mt-9">
                More about us
                <ArrowRight />
              </ButtonLink>
            </div>
          </div>
        </Container>
      </Section>

      {/* ---- Showroom ------------------------------------------------------- */}
      <Section size="md">
        <Container>
          <SectionHeading
            eyebrow="The showroom"
            title={[{ text: "Come and see us" }, { text: "in Stratford", tone: "muted" }]}
            lede={`${site.address.full}, with free parking on site. Call ahead and we'll have the car you want to see ready for you.`}
            action={<TextLink href="/contact">Contact &amp; directions</TextLink>}
          />
          <div className="reveal mt-14">
            <ShowroomPanel />
          </div>
        </Container>
      </Section>

      {/* ---- FAQ ------------------------------------------------------------ */}
      <FaqSection
        tinted
        faqs={homeFaqs()}
        eyebrow="Questions"
        title="Good to know before you buy"
        lede="The questions we're asked most. If yours isn't here, just ask."
        footer={
          <div className="flex flex-wrap gap-3">
            <ExternalButtonLink href={site.phone.href} variant="outline" size="md">
              <Phone className="size-4" />
              Call us
            </ExternalButtonLink>
            <ButtonLink href="/contact" variant="ghost" size="md">
              Send a message
            </ButtonLink>
          </div>
        }
      />

      {/* ---- Closing CTA ---------------------------------------------------- */}
      <ClosingCta photo={closingCar?.cover} />
    </>
  );
}
