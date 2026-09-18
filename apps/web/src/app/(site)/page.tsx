import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";

import { Hero } from "@/components/home/hero";
import { BuyingJourney } from "@/components/site/buying-journey";
import { FaqSection } from "@/components/site/faq-section";
import { ShowroomPanel } from "@/components/site/showroom-panel";
import { ButtonLink, ExternalButtonLink } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/icons";
import { Container, Eyebrow, Section, SectionHeading } from "@/components/ui/section";
import { StockEmptyState } from "@/components/vehicle/listing-promise";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
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
  const [featured, available] = await Promise.all([getFeaturedVehicles(STOCK_ROW), getAvailableVehicles()]);
  // Hand-picked cars lead; the rest of the row is topped up from stock so the
  // homepage never shows a half-empty row while there are cars for sale.
  const row = [...featured, ...available.filter((vehicle) => !featured.some((pick) => pick.id === vehicle.id))].slice(
    0,
    STOCK_ROW,
  );

  return (
    <>
      <Hero />

      {/* ---- Current stock ------------------------------------------------ */}
      <Section size="md">
        <Container>
          {row.length > 0 ? (
            <>
              <SectionHeading
                eyebrow="Current stock"
                title="On the floor right now"
                lede="A few of the cars in stock right now. Take your time, and ask us anything you'd like to know."
                action={<ViewAllLink />}
              />

              {/* One row: swiped sideways on phones (bleeding to the screen
                  edge, the next car peeking in), a grid from tablet up. */}
              <div className="-mx-5 mt-12 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-4">
                {row.map((vehicle) => (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    // Below the hero on every viewport; the headline is the LCP.
                    sizes="(min-width: 1280px) 22vw, (min-width: 640px) 45vw, 82vw"
                    className="reveal w-[82%] shrink-0 snap-start sm:w-auto"
                  />
                ))}
              </div>

              <div className="mt-10 flex flex-col items-start gap-6 border-t border-[var(--border)] pt-8 sm:flex-row sm:items-center sm:justify-between">
                <ButtonLink href="/vehicles" size="lg" className="w-full sm:w-auto">
                  View all {available.length} {available.length === 1 ? "car" : "cars"}
                  <ArrowRight />
                </ButtonLink>
                <p className="text-sm text-[var(--muted-foreground)] sm:max-w-md sm:text-right">
                  Stock moves and we don&rsquo;t list everything online.{" "}
                  <a
                    href={whatsappLinks.sourcing}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-b border-[var(--rule)] pb-0.5 transition-colors hover:text-[var(--rule)]"
                  >
                    Tell us what you&rsquo;re looking for
                  </a>{" "}
                  and we&rsquo;ll let you know what we have.
                </p>
              </div>
            </>
          ) : (
            // Nothing hand-picked: other stock is deliberately not promoted
            // here to fill the space. The panel explains why and points at a
            // person instead.
            <StockEmptyState showBrowse={available.length > 0} />
          )}
        </Container>
      </Section>

      {/* ---- Why buy from us ------------------------------------------------ */}
      <Section tinted size="md">
        <Container>
          <SectionHeading
            eyebrow="Why Stratford City Motorcars"
            title="An experience, not just a car sale"
            lede="We're a small family-owned business trading in sports and luxury cars. Here's what that means when you buy from us."
          />

          <ul className="mt-14 grid gap-px border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-3">
            {whyBuyHere.map((item, index) => (
              <li key={item.title} className="reveal bg-[var(--background)] p-7 md:p-9">
                <span aria-hidden data-numeric className="font-roman text-[0.625rem] tracking-[0.22em] text-[var(--rule)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-4 font-display text-xl leading-snug md:text-2xl">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]">{item.detail}</p>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* ---- How buying works ----------------------------------------------- */}
      <BuyingJourney />

      {/* ---- Finance ------------------------------------------------------- */}
      <Section tinted size="md">
        <Container>
          <div className="grid gap-14 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-20">
            <div className="lg:sticky lg:top-32 lg:self-start">
              <Eyebrow>Finance</Eyebrow>
              <h2 className="mt-5 text-[clamp(2rem,4vw,3rem)] leading-[1.06]">
                Spread the cost, without the fog
              </h2>
              <p className="mt-5 leading-relaxed text-[var(--muted-foreground)]">
                Hire Purchase, Personal Contract Purchase and personal loans work in different ways. We
                explain each one plainly, so you can decide what suits you before you commit to anything.
              </p>
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

            <div>
              <ul className="grid gap-px border border-[var(--border)] bg-[var(--border)]">
                {financeProducts.map((product) => (
                  <li key={product.key} className="reveal bg-[var(--background)] p-7 md:p-8">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <h3 className="font-display text-2xl">{product.name}</h3>
                      <span className="font-roman text-[0.625rem] uppercase tracking-[0.2em] text-[var(--rule)]">
                        {product.abbreviation}
                      </span>
                    </div>
                    <p className="mt-3 leading-relaxed text-[var(--muted-foreground)]">{product.summary}</p>
                    <p className="mt-4 text-sm">
                      <span className="text-[var(--muted-foreground)]">Best for </span>
                      {product.bestFor}
                    </p>
                  </li>
                ))}
              </ul>

              <h3 className="mt-10 font-roman text-[0.625rem] uppercase tracking-[0.22em] text-[var(--rule)]">
                The terms you&rsquo;ll see in any quote
              </h3>
              <dl className="mt-5 grid gap-x-10 gap-y-6 sm:grid-cols-2">
                {financeTerms.map((term) => (
                  <div key={term.title} className="border-t border-[var(--border)] pt-4">
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
      <Section size="md">
        <Container>
          <SectionHeading
            eyebrow="Part exchange"
            title="Your current car can do most of the work"
            lede="Send us its details and we'll usually come back within 24 hours on weekdays with an initial figure, confirmed once we've seen the car. There's no obligation to go ahead."
            action={
              <ButtonLink href="/part-exchange" size="md">
                Value your car
              </ButtonLink>
            }
          />

          <ol className="mt-14 grid gap-px border border-[var(--border)] bg-[var(--border)] md:grid-cols-2 lg:grid-cols-4">
            {partExchangeSteps.map((step, index) => (
              <li key={step.title} className="reveal bg-[var(--surface)] p-7 md:p-8">
                <span aria-hidden data-numeric className="font-display text-4xl leading-none text-ink-500">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-5 font-display text-lg leading-snug">{step.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-[var(--muted-foreground)]">{step.detail}</p>
              </li>
            ))}
          </ol>

          <p className="mt-8 text-xs text-[var(--muted-foreground)]">
            {site.compliance.partExchangeSubjectToInspection}
          </p>
        </Container>
      </Section>

      {/* ---- About ------------------------------------------------------------ */}
      <Section dark size="md" className="relative overflow-hidden">
        <Image
          src="/brand/silhouette-bone.webp"
          alt=""
          aria-hidden
          width={800}
          height={105}
          sizes="70vw"
          className="pointer-events-none absolute -left-[12%] bottom-10 w-[70%] max-w-none opacity-[0.04]"
        />
        <Container className="relative">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-20">
            <div>
              <Eyebrow>About us</Eyebrow>
              {/* The client's own words, approved in the intake: "don't touch it". */}
              <blockquote className="mt-6 font-display text-[clamp(1.6rem,3.4vw,2.5rem)] leading-[1.25]">
                &ldquo;We&rsquo;re a small, independent showroom and we like it that way. We won&rsquo;t put
                something on the forecourt we wouldn&rsquo;t be happy to drive ourselves.&rdquo;
              </blockquote>
            </div>
            <div className="lg:pt-12">
              <p className="leading-relaxed text-bone/70">
                We&rsquo;re a family business, and we&rsquo;d rather you left feeling good about your decision
                than rushed into one. Come in, take your time, look the car over properly and ask whatever you
                like. There&rsquo;s no pressure and no script.
              </p>
              <p className="mt-5 leading-relaxed text-bone/70">
                When you get in touch, you deal with us directly — from the first question to handing over the
                keys.
              </p>
              <ButtonLink href="/about" variant="outline" size="md" className="mt-8">
                More about us
              </ButtonLink>
            </div>
          </div>
        </Container>
      </Section>

      {/* ---- Showroom ------------------------------------------------------- */}
      <Section tinted size="md">
        <Container>
          <SectionHeading
            eyebrow="The showroom"
            title="Come and see us in Stratford"
            lede={`${site.address.full}, with free parking on site. Call ahead and we'll have the car you want to see ready for you.`}
            action={
              <ButtonLink href="/contact" variant="outline" size="md">
                Contact &amp; directions
              </ButtonLink>
            }
          />
          <div className="mt-14">
            <ShowroomPanel />
          </div>
        </Container>
      </Section>

      {/* ---- FAQ ------------------------------------------------------------ */}
      <FaqSection
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
      <Section dark size="lg">
        <Container className="text-center">
          <Eyebrow className="justify-center">Ready when you are</Eyebrow>
          <h2 className="mx-auto mt-6 max-w-3xl text-[clamp(2.4rem,6vw,4.25rem)] leading-[1.02]">
            Find your next car.
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-bone/60">
            Browse the stock, or just tell us what you&rsquo;re after and let us do the looking.
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

function ViewAllLink() {
  return (
    <Link
      href="/vehicles"
      className="group inline-flex items-center gap-2.5 border-b border-[var(--rule)] pb-1 text-sm transition-colors hover:text-[var(--rule)]"
    >
      View all vehicles
      <ArrowRight className="size-4 transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:translate-x-1" />
    </Link>
  );
}
