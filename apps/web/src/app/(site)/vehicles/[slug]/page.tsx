import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Banknote, CalendarCheck, Check, ExternalLink, Phone, Repeat } from "lucide-react";

import { BOOK_VIEWING_HASH, VehicleEnquiryForm } from "@/components/forms/vehicle-enquiry-form";
import { Breadcrumbs } from "@/components/site/page-hero";
import { ButtonLink, ExternalButtonLink } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/icons";
import { JsonLd } from "@/components/ui/json-ld";
import { Container, Eyebrow, Section } from "@/components/ui/section";
import { MobileActionBar } from "@/components/vehicle/mobile-action-bar";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
import { VehicleGallery } from "@/components/vehicle/vehicle-gallery";
import { VehicleHistory } from "@/components/vehicle/vehicle-history";
import { VehicleSpecification } from "@/components/vehicle/vehicle-specification";
import { VehicleVideo } from "@/components/vehicle/vehicle-video";
import { financeExampleFor, financeStatusStatement } from "@/lib/finance";
import { formatMileage, formatPrice, formatVehiclePrice } from "@/lib/format";
import { getRelatedVehicles, getVehicleBySlug, getVehicleSlugs } from "@/lib/inventory/repository";
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

  if (!vehicle) notFound();

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

      <div data-surface="dark" className="bg-ink-950 text-bone">
        <Container className="py-6">
          <Breadcrumbs crumbs={crumbs} />
        </Container>
      </div>

      <Section size="sm" className="pt-8 md:pt-10">
        <Container>
          {/*
            Three grid children, explicitly placed. DOM order is gallery →
            price and actions → editorial, which is what a phone stacks and what
            a screen reader reads, so the price is reached immediately rather
            than after the full specification. On desktop the panel moves into
            a sticky second column and the editorial slides up beneath the
            gallery.
          */}
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-x-14 lg:gap-y-12">
            <div className="min-w-0 lg:col-start-1 lg:row-start-1">
              <VehicleGallery images={vehicle.images} title={name} />
            </div>

            <div className="lg:sticky lg:top-28 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
              <PricePanel vehicle={vehicle} enquiryWhatsApp={enquiryWhatsApp} />

              <div className="mt-4 border border-[var(--border)] p-6 md:p-7">
                <h2 className="font-roman text-[0.625rem] uppercase tracking-[0.2em] text-[var(--rule)]">
                  Visit the showroom
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]">
                  {site.address.full}. {site.parking}{" "}
                  {isSold ? null : <>Call ahead and we&rsquo;ll have this car ready for you to see.</>}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
                  {site.hours.compact}.
                </p>
                <Link
                  href="/contact"
                  className="group mt-4 inline-flex items-center gap-2 border-b border-[var(--rule)] pb-1 text-sm transition-colors hover:text-[var(--rule)]"
                >
                  Directions &amp; opening hours
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>
            </div>

            <div className="min-w-0 lg:col-start-1 lg:row-start-2">
              <div className="space-y-12">
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
                        <a
                          key={spin.id}
                          href={spin.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group inline-flex items-center gap-2 border-b border-[var(--rule)] pb-1 text-sm transition-colors hover:text-[var(--rule)]"
                        >
                          {spin.title || "View the 360° spin"}
                          <ExternalLink aria-hidden className="size-3.5" />
                        </a>
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
                <Eyebrow>Enquire or book a viewing</Eyebrow>
                <h2 className="mt-5 text-[clamp(2rem,4vw,2.75rem)] leading-[1.08]">
                  Come and see this {vehicle.make}
                </h2>
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
                <Eyebrow>{isSold ? "Still available" : "You might also like"}</Eyebrow>
                <h2 className="mt-4 text-[clamp(1.75rem,3.4vw,2.5rem)] leading-tight">Other cars for sale</h2>
              </div>
              <Link
                href="/vehicles"
                className="group inline-flex items-center gap-2.5 border-b border-[var(--rule)] pb-1 text-sm transition-colors hover:text-[var(--rule)]"
              >
                View all stock
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="mt-10 grid gap-px bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <VehicleCard
                  key={item.id}
                  vehicle={item}
                  sizes="(min-width: 1024px) 30vw, (min-width: 640px) 46vw, 92vw"
                  className="reveal border-0"
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
        <div className="flex flex-wrap items-center gap-2">
          <Eyebrow>{vehicle.year}</Eyebrow>
          {isSold ? (
            <span className="bg-ink-950 px-2.5 py-1 font-roman text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-bone">
              Sold
            </span>
          ) : vehicle.reserved ? (
            <span className="bg-[var(--rule)] px-2.5 py-1 font-roman text-[0.5625rem] uppercase tracking-[0.18em] text-white">
              Reserved
            </span>
          ) : null}
        </div>

        <h1 className="mt-3 text-[clamp(1.75rem,3.4vw,2.5rem)] leading-[1.08]">{vehicle.title}</h1>
        {vehicle.variant ? (
          <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">{vehicle.variant}</p>
        ) : null}

        <p data-numeric className="mt-3 text-sm text-[var(--muted-foreground)]">
          {formatMileage(vehicle.mileage)} · {vehicle.fuel} · {vehicle.transmission}
        </p>

        <div className="mt-7 border-t border-[var(--border)] pt-6">
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
      className="border-b border-[var(--border)] pb-3 font-roman text-[0.625rem] uppercase tracking-[0.22em] text-[var(--rule)]"
    >
      {children}
    </h2>
  );
}
