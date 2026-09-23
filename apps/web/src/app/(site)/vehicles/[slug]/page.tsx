import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowRight, Banknote, CalendarCheck, Check, ExternalLink, Phone, Repeat } from "lucide-react";

import { BOOK_VIEWING_HASH, VehicleEnquiryForm } from "@/components/forms/vehicle-enquiry-form";
import { Breadcrumbs } from "@/components/site/page-hero";
import { ButtonLink, ExternalButtonLink } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/icons";
import { JsonLd } from "@/components/ui/json-ld";
import { Container, Eyebrow, Section } from "@/components/ui/section";
import { SplitText } from "@/components/ui/split-text";
import { ExternalTextLink, TextLink } from "@/components/ui/text-link";
import { MobileActionBar } from "@/components/vehicle/mobile-action-bar";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
import { VehicleGallery } from "@/components/vehicle/vehicle-gallery";
import { VehicleHistory } from "@/components/vehicle/vehicle-history";
import { VehicleSpecification } from "@/components/vehicle/vehicle-specification";
import { VehicleVideo } from "@/components/vehicle/vehicle-video";
import { paymentMethods } from "@/lib/content/services";
import { financeExampleFor, financeStatusStatement } from "@/lib/finance";
import { formatMileage, formatPrice, formatVehiclePrice } from "@/lib/format";
import { getRelatedVehicles, getVehicleBySlug, getVehicleSlugs, resolvePreviousSlug } from "@/lib/inventory/repository";
import type { PublicVehicle } from "@/lib/inventory/types";
import { reservationOffer } from "@/lib/reservations";
import { breadcrumbSchema, pageMetadata, vehicleMetaDescription, vehicleSchema } from "@/lib/seo";
import { site } from "@/lib/site";
import { whatsappForVehicle, whatsappLinks } from "@/lib/whatsapp";

/** Prerender every public vehicle, sold ones included — their pages stay up. */
export async function generateStaticParams() {
  const slugs = await getVehicleSlugs();
  return slugs.map((slug) => ({ slug }));
}

/**
 * A car whose web address was changed in the dashboard keeps its old slugs in
 * `previousSlugs`; links to the old address land on the current page.
 */
async function redirectRenamedVehicle(slug: string) {
  if (!/^[a-z0-9-]{1,160}$/.test(slug)) return;
  const current = await resolvePreviousSlug(slug);
  if (current && current !== slug) permanentRedirect(`/vehicles/${current}`);
}

export async function generateMetadata(props: PageProps<"/vehicles/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const vehicle = await getVehicleBySlug(slug);

  if (!vehicle) {
    return { title: "Vehicle not found", robots: { index: false, follow: true } };
  }

  const name = `${vehicle.year} ${vehicle.title}`;
  return pageMetadata({
    title:
      vehicle.seoTitle ??
      (vehicle.isSold ? `${name} — Sold` : `${name} — ${formatVehiclePrice(vehicle)}`),
    description: vehicle.seoDescription ?? vehicleMetaDescription(vehicle),
    path: `/vehicles/${vehicle.slug}`,
    image: vehicle.cover.src,
    imageAlt: vehicle.cover.alt,
  });
}

export default async function VehiclePage(props: PageProps<"/vehicles/[slug]">) {
  const { slug } = await props.params;
  const vehicle = await getVehicleBySlug(slug);

  if (!vehicle) {
    await redirectRenamedVehicle(slug);
    notFound();
  }

  const related = await getRelatedVehicles(slug, 3);
  const name = `${vehicle.year} ${vehicle.title}`;

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Stock", path: "/vehicles" },
    { name, path: `/vehicles/${vehicle.slug}` },
  ];

  const enquiryWhatsApp = whatsappForVehicle(vehicle);
  const { isSold } = vehicle;

  return (
    <>
      <JsonLd data={[vehicleSchema(vehicle), breadcrumbSchema(crumbs)]} />

      {/* ---- The stage: name, price and photographs on ink ------------------ */}
      <section data-surface="dark" aria-label={`${name} photographs`} className="grain bg-ink-950 text-bone">
        <Container className="pb-10 pt-6 md:pb-14">
          <Breadcrumbs crumbs={crumbs} />

          <div className="mt-8 flex flex-col gap-6 md:mt-12 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
            <div className="min-w-0">
              <div className="intro flex flex-wrap items-center gap-3">
                <Eyebrow>
                  {vehicle.year} · {vehicle.bodyType}
                </Eyebrow>
                {isSold ? (
                  <span className="bg-bone px-2.5 py-1 font-roman text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-ink-950">
                    Sold
                  </span>
                ) : vehicle.reserved ? (
                  <span className="bg-brass px-2.5 py-1 font-roman text-[0.625rem] uppercase tracking-[0.18em] text-ink-950">
                    Reserved
                  </span>
                ) : null}
              </div>
              <SplitText
                as="h1"
                play="load"
                delay={80}
                runs={vehicle.title}
                className="mt-5 text-[clamp(2.3rem,5vw,4.25rem)] leading-[1.02] tracking-[-0.028em]"
              />
              {vehicle.variant ? (
                <p className="intro mt-3 text-base text-bone/55 md:text-lg" style={{ "--intro-delay": "260ms" } as CSSProperties}>
                  {vehicle.variant}
                </p>
              ) : null}
            </div>

            <div className="intro shrink-0 lg:pb-2 lg:text-right" style={{ "--intro-delay": "300ms" } as CSSProperties}>
              <p className="font-roman text-[0.625rem] uppercase tracking-[0.22em] text-bone/50">
                {isSold ? "Status" : vehicle.priceOnApplication || vehicle.price === null ? "Price" : "Cash price"}
              </p>
              <p data-numeric className="mt-2 font-display text-[clamp(2.25rem,4.4vw,3.5rem)] leading-none">
                {isSold ? "Sold" : vehicle.priceOnApplication || vehicle.price === null ? "On application" : formatPrice(vehicle.price)}
              </p>
            </div>
          </div>

          <div className="intro mt-8 md:mt-10" style={{ "--intro-delay": "200ms" } as CSSProperties}>
            <VehicleGallery images={vehicle.images} title={name} vehicleId={vehicle.id} />
          </div>

          <KeySpecs vehicle={vehicle} />
        </Container>
      </section>

      <Section size="sm" className="pt-12 md:pt-16">
        <Container>
          {/*
            Two grid children, explicitly placed. DOM order is price and
            actions → editorial, which is what a phone stacks and what a screen
            reader reads, so the price is reached immediately rather than after
            the full specification. On desktop the panel moves into a sticky
            second column.
          */}
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-x-16">
            <div className="lg:sticky lg:top-28 lg:col-start-2 lg:row-start-1 lg:self-start">
              <PricePanel vehicle={vehicle} enquiryWhatsApp={enquiryWhatsApp} />

              <div className="mt-4 border border-[var(--border)] p-6 md:p-7">
                <h2 className="font-roman text-[0.625rem] uppercase tracking-[0.2em] text-[var(--accent-text)]">
                  Visit the showroom
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]">
                  {site.address.full}. {site.parking}{" "}
                  {isSold ? null : <>Call ahead and we&rsquo;ll have this car ready for you to see.</>}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
                  {site.hours.compact}.
                </p>
                <TextLink href="/contact" className="mt-5">
                  Directions &amp; opening hours
                </TextLink>
              </div>
            </div>

            <div className="min-w-0 lg:col-start-1 lg:row-start-1">
              <div className="space-y-14">
                <section aria-labelledby="overview">
                  <SectionLabel id="overview">Overview</SectionLabel>
                  <div className="mt-5 space-y-4 text-base leading-[1.75] text-[var(--foreground)] md:text-lg">
                    {vehicle.description
                      .split(/\n{2,}/)
                      .map((paragraph) => paragraph.trim())
                      .filter(Boolean)
                      .map((paragraph) => (
                        <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                      ))}
                  </div>
                </section>

                {vehicle.videos.length || vehicle.spins.length ? (
                  <section aria-labelledby="walkaround">
                    <SectionLabel id="walkaround">Walkaround</SectionLabel>
                    <div className="mt-5 space-y-5">
                      {vehicle.videos.map((video) => (
                        <VehicleVideo key={video.id} video={video} vehicleName={name} />
                      ))}
                      {vehicle.spins.map((spin) => (
                        <ExternalTextLink key={spin.id} href={spin.url} target="_blank" rel="noopener noreferrer">
                          {spin.title || "View the 360° spin"}
                          <ExternalLink aria-hidden className="size-3.5" />
                        </ExternalTextLink>
                      ))}
                    </div>
                  </section>
                ) : null}

                <section aria-labelledby="specification">
                  <SectionLabel id="specification">Specification</SectionLabel>
                  <VehicleSpecification vehicle={vehicle} />
                </section>

                {vehicle.features.length ? (
                  <section aria-labelledby="features">
                    <SectionLabel id="features">Key features</SectionLabel>
                    <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                      {vehicle.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3 text-sm">
                          <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--rule)]" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                <section aria-labelledby="history">
                  <SectionLabel id="history">History, checks &amp; cover</SectionLabel>
                  <VehicleHistory vehicle={vehicle} />
                </section>

                {!isSold ? (
                  <section aria-labelledby="buying">
                    <SectionLabel id="buying">Buying this car</SectionLabel>
                    <dl className="mt-5 divide-y divide-[var(--border)] border-y border-[var(--border)]">
                      {[
                        { term: "Ways to pay", detail: paymentMethods.join(", ") + "." },
                        {
                          term: "Part exchange",
                          detail: "Welcome — an initial figure usually within 24 hours on weekdays.",
                        },
                        {
                          term: "Delivery",
                          detail: "Nationwide. A charge may apply — ask us about this car.",
                        },
                        {
                          term: "Viewing",
                          detail: `Request one below. ${site.hours.compact}; out-of-hours by WhatsApp or text.`,
                        },
                      ].map((row) => (
                        <div key={row.term} className="grid gap-1 py-4 text-sm sm:grid-cols-[9rem_1fr] sm:gap-6">
                          <dt className="font-medium">{row.term}</dt>
                          <dd className="leading-relaxed text-[var(--muted-foreground)]">{row.detail}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ) : null}
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {!isSold ? (
        <Section id="enquire" tinted size="md" className="scroll-mt-24">
          {/* Target of "Book a viewing": the form reads the hash and opens on a viewing request. */}
          <span id="book-viewing" aria-hidden className="block scroll-mt-24" />
          <Container>
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-20">
              <div>
                <Eyebrow className="reveal">Enquire or book a viewing</Eyebrow>
                <SplitText
                  runs={[{ text: "Come and see" }, { text: `this ${vehicle.make}`, tone: "muted" }]}
                  className="mt-6 text-[clamp(2.25rem,4.6vw,3.5rem)] leading-[1.03] tracking-[-0.025em]"
                />
                <p className="mt-5 max-w-lg leading-relaxed text-[var(--muted-foreground)]">
                  Ask us anything, or request a viewing or test drive. A viewing request is exactly that — a
                  request — and we&rsquo;ll confirm a time with you by phone or WhatsApp.
                </p>

                <ul className="mt-9 space-y-4">
                  {[
                    "No obligation and no pressure to decide on the spot",
                    site.hours.sentence,
                    "Viewings outside opening hours can be arranged by WhatsApp or text",
                  ].map((point) => (
                    <li key={point} className="flex items-start gap-3 text-sm">
                      <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--rule)]" />
                      {point}
                    </li>
                  ))}
                </ul>

                <div className="mt-10 grid gap-px bg-[var(--border)] sm:grid-cols-2">
                  <PromptLink
                    href={`/part-exchange?vehicle=${vehicle.slug}`}
                    icon={<Repeat className="size-4" />}
                    title="Part exchange"
                    detail="Tell us about your current car and we'll come back with an initial figure."
                  />
                  <PromptLink
                    href={`/finance?vehicle=${vehicle.slug}`}
                    icon={<Banknote className="size-4" />}
                    title="Finance"
                    detail="How HP, PCP and personal loans work, and a short enquiry form."
                  />
                </div>
              </div>

              <div className="border border-[var(--border)] bg-[var(--background)] p-6 md:p-8">
                <VehicleEnquiryForm vehicleSlug={vehicle.slug} vehicleTitle={vehicle.title} vehicleYear={vehicle.year} />
              </div>
            </div>
          </Container>
        </Section>
      ) : null}

      {related.length ? (
        <Section size="md">
          <Container>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <Eyebrow className="reveal">{isSold ? "Still available" : "You might also like"}</Eyebrow>
                <SplitText
                  runs={[{ text: "Other cars" }, { text: "for sale", tone: "muted" }]}
                  className="mt-5 text-[clamp(2rem,4vw,3.25rem)] leading-[1.04] tracking-[-0.025em]"
                />
              </div>
              <TextLink href="/vehicles">View all stock</TextLink>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <VehicleCard
                  key={item.id}
                  vehicle={item}
                  sizes="(min-width: 1024px) 30vw, (min-width: 640px) 46vw, 92vw"
                  className="reveal"
                />
              ))}
            </div>
          </Container>
        </Section>
      ) : null}

      {!isSold ? (
        <>
          <MobileActionBar whatsappHref={enquiryWhatsApp} price={formatVehiclePrice(vehicle)} />
          {/* Clears the sticky bar so it never covers the footer's last line. */}
          <div aria-hidden className="h-20 lg:hidden" />
        </>
      ) : null}
    </>
  );
}

function PricePanel({ vehicle, enquiryWhatsApp }: { vehicle: PublicVehicle; enquiryWhatsApp: string }) {
  const finance = financeExampleFor(vehicle);
  const statusStatement = financeStatusStatement();
  const reservation = reservationOffer(vehicle);
  const { isSold } = vehicle;

  return (
    <div className="border border-[var(--border)]">
      <div className="border-b border-[var(--border)] p-6 md:p-7">
        <p className="font-display text-xl leading-snug">
          {vehicle.year} {vehicle.title}
        </p>
        <p data-numeric className="mt-1.5 text-sm text-[var(--muted-foreground)]">
          {formatMileage(vehicle.mileage)} · {vehicle.fuel} · {vehicle.transmission}
        </p>

        <div className="mt-6 border-t border-[var(--border)] pt-6">
          {isSold ? (
            <p className="font-display text-[clamp(2rem,4.4vw,2.75rem)] leading-none">Sold</p>
          ) : vehicle.priceOnApplication || vehicle.price === null ? (
            <>
              <p className="font-roman text-[0.625rem] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                Price
              </p>
              <p className="mt-1.5 font-display text-[clamp(2rem,4.4vw,2.75rem)] leading-none">On application</p>
              <p className="mt-2.5 text-xs text-[var(--muted-foreground)]">Call or message us for the current price.</p>
            </>
          ) : (
            <>
              <p className="font-roman text-[0.625rem] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                Cash price
              </p>
              <p data-numeric className="mt-1.5 font-display text-[clamp(2.25rem,5vw,3rem)] leading-none">
                {formatPrice(vehicle.price)}
              </p>
              <p className="mt-2.5 text-xs text-[var(--muted-foreground)]">
                Includes VAT where applicable.
                {vehicle.adminFee ? <> Plus an admin fee of {formatPrice(vehicle.adminFee)}.</> : null}
              </p>
            </>
          )}

          {finance && statusStatement ? (
            <div className="mt-5 border-t border-[var(--border)] pt-5 text-xs leading-relaxed text-[var(--muted-foreground)]">
              <p className="text-sm text-[var(--foreground)]">
                <span data-numeric className="font-display text-xl">
                  {formatPrice(finance.monthlyPayment)}
                </span>{" "}
                per month ({finance.product}, {finance.termMonths} months)
              </p>
              <p className="mt-2">
                Representative example: cash price {formatPrice(vehicle.price ?? 0)}, deposit{" "}
                {formatPrice(finance.deposit)}, total credit {formatPrice(finance.totalCredit)},{" "}
                {finance.termMonths} monthly payments of {formatPrice(finance.monthlyPayment)}
                {finance.optionalFinalPayment ? <>, optional final payment {formatPrice(finance.optionalFinalPayment)}</> : null}
                , total amount payable {formatPrice(finance.totalAmountPayable)}. Fixed rate {finance.fixedRate}% p.a.
                Representative {finance.apr}% APR. Lender: {finance.lender}.
              </p>
              <p className="mt-2">{statusStatement}</p>
            </div>
          ) : null}
        </div>
      </div>

      {isSold ? (
        <div className="p-6 md:p-7">
          <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
            This car has been sold. Tell us what you were after and we&rsquo;ll let you know if something
            similar comes in.
          </p>
          <div className="mt-5 grid gap-2.5">
            <ButtonLink href="/vehicles" size="md" className="w-full">
              See cars for sale
            </ButtonLink>
            <ExternalButtonLink
              href={whatsappLinks.sourcing}
              target="_blank"
              rel="noopener noreferrer"
              variant="outline"
              size="md"
              className="w-full"
            >
              <WhatsAppIcon className="size-4" />
              Tell us what you want
            </ExternalButtonLink>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5 p-6 md:p-7">
          <ExternalButtonLink
            href={enquiryWhatsApp}
            target="_blank"
            rel="noopener noreferrer"
            variant="whatsapp"
            size="lg"
            className="w-full"
          >
            <WhatsAppIcon className="size-4" />
            WhatsApp us about this car
          </ExternalButtonLink>

          <ExternalButtonLink href={site.phone.href} variant="outline" size="lg" className="w-full">
            <Phone className="size-4" />
            {site.phone.display}
          </ExternalButtonLink>

          {/* Same-page anchor, so a plain link rather than a route. */}
          <ExternalButtonLink href={BOOK_VIEWING_HASH} variant="outline" size="lg" className="w-full">
            <CalendarCheck className="size-4" />
            Book a viewing
          </ExternalButtonLink>

          {reservation ? (
            <a
              href={reservation.checkoutUrl}
              className="block pt-2 text-center text-sm underline underline-offset-4 transition-colors hover:text-[var(--rule)]"
            >
              Reserve online with a {formatPrice(reservation.depositGbp)} deposit
            </a>
          ) : null}
        </div>
      )}
    </div>
  );
}

function PromptLink({
  href,
  icon,
  title,
  detail,
}: {
  href: `/part-exchange?vehicle=${string}` | `/finance?vehicle=${string}`;
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="group block bg-[var(--surface)] p-5 transition-colors hover:bg-[var(--background)]"
    >
      <span aria-hidden className="text-[var(--rule)]">
        {icon}
      </span>
      <span className="mt-3 flex items-center gap-2 font-display text-lg">
        {title}
        <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
      </span>
      <span className="mt-1.5 block text-xs leading-relaxed text-[var(--muted-foreground)]">{detail}</span>
    </Link>
  );
}

function SectionLabel({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="reveal flex items-center gap-3 border-b border-[var(--border)] pb-4 font-roman text-[0.625rem] uppercase tracking-[0.22em] text-[var(--accent-text)]"
    >
      <span aria-hidden className="h-px w-7 bg-[var(--rule)]" />
      {children}
    </h2>
  );
}

/**
 * The particulars a buyer scans first, set large on the stage beneath the
 * photographs. Rows the listing does not hold are left out.
 */
function KeySpecs({ vehicle }: { vehicle: PublicVehicle }) {
  const rows = [
    { term: "Mileage", value: formatMileage(vehicle.mileage) },
    { term: "Fuel", value: vehicle.fuel },
    { term: "Gearbox", value: vehicle.transmission },
    vehicle.engine ? { term: "Engine", value: vehicle.engine } : null,
    vehicle.power ? { term: "Power", value: vehicle.power } : null,
    vehicle.colour ? { term: "Colour", value: vehicle.colour } : null,
  ].filter((row): row is { term: string; value: string } => row !== null);

  return (
    <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-7 border-t border-bone/12 pt-8 md:grid-cols-3 lg:mt-12 lg:grid-cols-6">
      {rows.map((row) => (
        <div key={row.term} className="reveal min-w-0 border-l border-brass/35 pl-4">
          <dt className="font-roman text-[0.625rem] uppercase tracking-[0.22em] text-bone/50">{row.term}</dt>
          <dd data-numeric className="mt-1.5 font-display text-lg leading-snug text-bone md:text-xl">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
