import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Car,
  Check,
  Phone,
  Repeat,
  ShieldCheck,
} from "lucide-react";

import { VehicleEnquiryForm } from "@/components/forms/vehicle-enquiry-form";
import { Breadcrumbs } from "@/components/site/page-hero";
import { ButtonLink, ExternalButtonLink } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/icons";
import { JsonLd } from "@/components/ui/json-ld";
import { Container, Eyebrow, Section } from "@/components/ui/section";
import { MobileActionBar } from "@/components/vehicle/mobile-action-bar";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
import { VehicleGallery } from "@/components/vehicle/vehicle-gallery";
import {
  formatMileage,
  formatPrice,
  formatWarranty,
} from "@/lib/format";
import {
  getRelatedVehicles,
  getVehicleBySlug,
  getVehicleSlugs,
} from "@/lib/inventory/repository";
import type { VehicleView } from "@/lib/inventory/types";
import {
  breadcrumbSchema,
  pageMetadata,
  vehicleMetaDescription,
  vehicleSchema,
} from "@/lib/seo";
import { site } from "@/lib/site";
import {
  whatsappFinanceForVehicle,
  whatsappForVehicle,
  whatsappPartExchangeForVehicle,
} from "@/lib/whatsapp";

/** Prerender every listing — the catalogue is small and this makes it instant. */
export async function generateStaticParams() {
  const slugs = await getVehicleSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata(
  props: PageProps<"/vehicles/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const vehicle = await getVehicleBySlug(slug);

  if (!vehicle) {
    return { title: "Vehicle not found", robots: { index: false, follow: true } };
  }

  return pageMetadata({
    title: `${vehicle.year} ${vehicle.title} — ${formatPrice(vehicle.price)}`,
    description: vehicleMetaDescription(vehicle),
    path: `/vehicles/${vehicle.slug}`,
    image: vehicle.displayImages[0]?.src,
  });
}

export default async function VehiclePage(props: PageProps<"/vehicles/[slug]">) {
  const { slug } = await props.params;
  const vehicle = await getVehicleBySlug(slug);

  if (!vehicle) notFound();

  const related = await getRelatedVehicles(slug, 3);

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Stock", path: "/vehicles" },
    { name: `${vehicle.year} ${vehicle.title}`, path: `/vehicles/${vehicle.slug}` },
  ];

  const enquiryWhatsApp = whatsappForVehicle(vehicle);
  const isSold = vehicle.status === "sold";

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
            price and CTAs → editorial, which is what a phone stacks and what a
            screen reader reads, so the price is reached immediately rather
            than after the full specification. On desktop the explicit
            col-start/row-start moves the panel into a sticky second column and
            slides the editorial up beneath the gallery.
          */}
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-x-14 lg:gap-y-12">
            {/* ---- Gallery ------------------------------------------------ */}
            <div className="min-w-0 lg:col-start-1 lg:row-start-1">
              <VehicleGallery
                images={vehicle.displayImages}
                make={vehicle.make}
                year={vehicle.year}
                title={`${vehicle.year} ${vehicle.title}`}
                isLibrary={vehicle.showingLibraryImages}
              />
            </div>

            {/* ---- Price and enquiry panel -------------------------------- */}
            <div className="lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-28 lg:self-start">
              <div className="border border-[var(--border)]">
                <div className="border-b border-[var(--border)] p-6 md:p-7">
                  <div className="flex flex-wrap items-center gap-2">
                    <Eyebrow>{vehicle.year}</Eyebrow>
                    {isSold ? (
                      <span className="bg-ink-950 px-2.5 py-1 font-roman text-[0.5625rem] uppercase tracking-[0.18em] text-bone">
                        Sold
                      </span>
                    ) : null}
                    {vehicle.status === "reserved" ? (
                      <span className="bg-[var(--rule)] px-2.5 py-1 font-roman text-[0.5625rem] uppercase tracking-[0.18em] text-white">
                        Reserved
                      </span>
                    ) : null}
                  </div>

                  <h1 className="mt-3 text-[clamp(1.75rem,3.4vw,2.5rem)] leading-[1.08]">
                    {vehicle.title}
                  </h1>

                  <p
                    data-numeric
                    className="mt-3 text-sm text-[var(--muted-foreground)]"
                  >
                    {formatMileage(vehicle.mileage)} · {vehicle.fuel} ·{" "}
                    {vehicle.transmission}
                  </p>

                  <div className="mt-7 border-t border-[var(--border)] pt-6">
                    <p className="font-roman text-[0.625rem] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                      Cash price
                    </p>
                    <p
                      data-numeric
                      className="mt-1.5 font-display text-[clamp(2.25rem,5vw,3rem)] leading-none"
                    >
                      {formatPrice(vehicle.price)}
                    </p>
                    <p className="mt-2.5 text-xs text-[var(--muted-foreground)]">
                      Includes VAT where applicable. Finance available subject to
                      status.
                    </p>
                  </div>
                </div>

                {!isSold ? (
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
                      WhatsApp us
                    </ExternalButtonLink>

                    <ExternalButtonLink
                      href={site.phone.href}
                      variant="outline"
                      size="lg"
                      className="w-full"
                    >
                      <Phone className="size-4" />
                      {site.phone.display}
                    </ExternalButtonLink>

                    <div className="grid grid-cols-2 gap-2.5 pt-1.5">
                      <ExternalButtonLink
                        href={whatsappFinanceForVehicle(vehicle)}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="ghost"
                        size="sm"
                        className="border-[var(--border-strong)]"
                      >
                        <Banknote className="size-4" />
                        Finance
                      </ExternalButtonLink>
                      <ExternalButtonLink
                        href={whatsappPartExchangeForVehicle(vehicle)}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="ghost"
                        size="sm"
                        className="border-[var(--border-strong)]"
                      >
                        <Repeat className="size-4" />
                        Part exchange
                      </ExternalButtonLink>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 md:p-7">
                    <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
                      This one has gone. Tell us what you were after and
                      we&rsquo;ll let you know when something similar arrives.
                    </p>
                    <ButtonLink href="/vehicles" size="md" className="mt-5 w-full">
                      See what else we have
                    </ButtonLink>
                  </div>
                )}
              </div>

              <div className="mt-4 border border-[var(--border)] p-6 md:p-7">
                <h2 className="font-roman text-[0.625rem] uppercase tracking-[0.2em] text-[var(--rule)]">
                  Visit the showroom
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]">
                  {site.address.full}. {site.parking} Call ahead and we&rsquo;ll
                  have this car ready for you to see.
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

            {/* ---- Editorial ---------------------------------------------- */}
            <div className="min-w-0 lg:col-start-1 lg:row-start-2">
              <div className="space-y-12">
                <section aria-labelledby="overview">
                  <SectionLabel id="overview">Overview</SectionLabel>
                  <p className="mt-5 text-base leading-[1.75] text-[var(--foreground)] md:text-lg">
                    {vehicle.description}
                  </p>
                </section>

                <section aria-labelledby="specification">
                  <SectionLabel id="specification">Specification</SectionLabel>
                  <SpecTable vehicle={vehicle} />
                </section>

                {vehicle.features.length ? (
                  <section aria-labelledby="features">
                    <SectionLabel id="features">Key features</SectionLabel>
                    <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                      {vehicle.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3 text-sm">
                          <Check
                            aria-hidden
                            className="mt-0.5 size-4 shrink-0 text-[var(--rule)]"
                          />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                <section aria-labelledby="assurance">
                  <SectionLabel id="assurance">
                    Condition, history &amp; cover
                  </SectionLabel>
                  <dl className="mt-5 grid gap-px bg-[var(--border)] sm:grid-cols-3">
                    <AssuranceCard
                      icon={<BadgeCheck className="size-4" />}
                      term="HPI status"
                      value={vehicle.hpiClear ? "HPI clear" : "Ask us"}
                      detail={
                        vehicle.hpiClear
                          ? "Not stolen, not written off, no outstanding finance. Documentation provided."
                          : "We'll confirm the HPI position for this vehicle in writing."
                      }
                    />
                    <AssuranceCard
                      icon={<ShieldCheck className="size-4" />}
                      term="Warranty"
                      value={formatWarranty(vehicle.warrantyMonths)}
                      detail="AA warranty options up to 12 months. Cover depends on the vehicle's age and value."
                    />
                    <AssuranceCard
                      icon={<Car className="size-4" />}
                      term="Service history"
                      value={vehicle.serviceHistory ?? "Ask us"}
                      detail={
                        vehicle.serviceHistory
                          ? "Documentation available to view at the showroom."
                          : "We'll go through the history file with you before you commit."
                      }
                    />
                  </dl>

                  <p className="mt-5 text-xs leading-relaxed text-[var(--muted-foreground)]">
                    <strong className="font-medium text-[var(--foreground)]">
                      ULEZ:
                    </strong>{" "}
                    a vehicle&rsquo;s ULEZ position depends on its Euro emissions
                    rating rather than its age alone. We&rsquo;ll confirm this
                    car&rsquo;s status in writing before you buy — ask us and
                    we&rsquo;ll check the registration for you.
                  </p>
                </section>
              </div>
            </div>

          </div>
        </Container>
      </Section>

      {/* ---- Enquiry form ------------------------------------------------ */}
      {!isSold ? (
        <Section id="enquire" tinted size="md" className="scroll-mt-24">
          <Container>
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-20">
              <div>
                <Eyebrow>Enquire</Eyebrow>
                <h2 className="mt-5 text-[clamp(2rem,4vw,2.75rem)] leading-[1.08]">
                  Ask us about this {vehicle.make}
                </h2>
                <p className="mt-5 max-w-lg leading-relaxed text-[var(--muted-foreground)]">
                  Send us a message and we&rsquo;ll come back to you with
                  anything you want to know — history, condition, finance
                  figures, or a part-exchange valuation for your current car.
                </p>

                <ul className="mt-9 space-y-4">
                  {[
                    "No obligation and no pressure to decide on the spot",
                    "We'll confirm the full specification and history in writing",
                    "Viewings outside opening hours can be arranged",
                  ].map((point) => (
                    <li key={point} className="flex items-start gap-3 text-sm">
                      <Check
                        aria-hidden
                        className="mt-0.5 size-4 shrink-0 text-[var(--rule)]"
                      />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border border-[var(--border)] bg-[var(--background)] p-6 md:p-8">
                <VehicleEnquiryForm
                  vehicleSlug={vehicle.slug}
                  vehicleTitle={vehicle.title}
                  vehicleYear={vehicle.year}
                />
              </div>
            </div>
          </Container>
        </Section>
      ) : null}

      {/* ---- Related ------------------------------------------------------ */}
      {related.length ? (
        <Section size="md">
          <Container>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <Eyebrow>You might also like</Eyebrow>
                <h2 className="mt-4 text-[clamp(1.75rem,3.4vw,2.5rem)] leading-tight">
                  Other cars on the floor
                </h2>
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
                <VehicleCard key={item.id} vehicle={item} className="reveal border-0" />
              ))}
            </div>
          </Container>
        </Section>
      ) : null}

      {!isSold ? (
        <MobileActionBar whatsappHref={enquiryWhatsApp} price={vehicle.price} />
      ) : null}

      {/* Clears the sticky bar so it never covers the footer's last line. */}
      {!isSold ? <div aria-hidden className="h-20 lg:hidden" /> : null}
    </>
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

/**
 * Renders only the rows we actually hold a value for. A vehicle with no
 * recorded engine size shows no engine row rather than an empty one or,
 * worse, a guess.
 */
function SpecTable({ vehicle }: { vehicle: VehicleView }) {
  const rows: { term: string; value: string }[] = [
    { term: "Make", value: vehicle.make },
    { term: "Model", value: vehicle.model },
    { term: "Year", value: String(vehicle.year) },
    { term: "Mileage", value: formatMileage(vehicle.mileage) },
    { term: "Body type", value: vehicle.bodyType },
    { term: "Fuel", value: vehicle.fuel },
    { term: "Transmission", value: vehicle.transmission },
    { term: "Exterior colour", value: vehicle.colour },
  ];

  if (vehicle.engine) rows.push({ term: "Engine", value: vehicle.engine });
  if (vehicle.power) rows.push({ term: "Power", value: vehicle.power });
  if (vehicle.interior) rows.push({ term: "Interior", value: vehicle.interior });
  if (vehicle.doors) rows.push({ term: "Doors", value: String(vehicle.doors) });
  if (vehicle.seats) rows.push({ term: "Seats", value: String(vehicle.seats) });
  if (vehicle.registration) {
    rows.push({ term: "Registration", value: vehicle.registration });
  }

  return (
    <dl className="mt-5 grid gap-x-12 sm:grid-cols-2">
      {rows.map((row) => (
        <div
          key={row.term}
          className="flex justify-between gap-6 border-b border-[var(--border)] py-3.5 text-sm"
        >
          <dt className="text-[var(--muted-foreground)]">{row.term}</dt>
          <dd data-numeric className="text-right font-medium">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function AssuranceCard({
  icon,
  term,
  value,
  detail,
}: {
  icon: React.ReactNode;
  term: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="bg-[var(--background)] p-5">
      <dt className="font-roman text-[0.5625rem] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
        <span aria-hidden className="mb-3 block text-[var(--rule)]">
          {icon}
        </span>
        {term}
      </dt>
      <dd className="mt-1.5">
        <span className="block text-sm font-medium">{value}</span>
        <span className="mt-2 block text-xs leading-relaxed text-[var(--muted-foreground)]">
          {detail}
        </span>
      </dd>
    </div>
  );
}
