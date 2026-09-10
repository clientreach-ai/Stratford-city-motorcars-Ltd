import type { Metadata } from "next";
import { Suspense } from "react";
import { Phone } from "lucide-react";

import { PageHero } from "@/components/site/page-hero";
import { ExternalButtonLink } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/icons";
import { JsonLd } from "@/components/ui/json-ld";
import { Container, Section } from "@/components/ui/section";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
import {
  VehicleFilterRail,
  VehicleFilterSheet,
} from "@/components/vehicle/vehicle-filters";
import { ActiveFilterChips, VehicleSort } from "@/components/vehicle/vehicle-sort";
import {
  countActiveFilters,
  describeQuery,
  parseSearchParams,
} from "@/lib/inventory/query-params";
import { searchVehicles } from "@/lib/inventory/repository";
import { breadcrumbSchema, itemListSchema, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { whatsappLinks } from "@/lib/whatsapp";

/**
 * Filtered views share one canonical. Every combination of make, price and body
 * type would otherwise look like a separate near-duplicate page to a crawler,
 * and with stock this size none of them carries enough distinct content to
 * deserve its own listing.
 */
export async function generateMetadata(
  props: PageProps<"/vehicles">,
): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const filtered = countActiveFilters(parseSearchParams(searchParams)) > 0;

  return {
    ...pageMetadata({
      title: "Used Cars for Sale in Stratford, London",
      description:
        "Browse prestige, performance and classic used cars at our Stratford showroom. Every vehicle HPI clear and inspected. Finance and part exchange available.",
      path: "/vehicles",
    }),
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  };
}

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Stock", path: "/vehicles" },
];

export default async function VehiclesPage(props: PageProps<"/vehicles">) {
  const searchParams = await props.searchParams;
  const query = parseSearchParams(searchParams);
  const { results, total, facets } = await searchVehicles(query);

  const activeCount = countActiveFilters(query);
  const summary = describeQuery(query);

  return (
    <>
      <JsonLd
        data={[breadcrumbSchema(crumbs), itemListSchema(results)]}
      />

      <PageHero
        eyebrow="Current stock"
        title={summary ? `${summary}` : "Every car we have, in one place"}
        lede={
          summary
            ? `Showing the ${results.length === 1 ? "one car" : `${results.length} cars`} that match. Adjust the filters to widen your search.`
            : "Prestige saloons, performance convertibles, classic Rolls-Royces and everyday SUVs. Each one chosen, checked and prepared before it goes on sale."
        }
        crumbs={crumbs}
      />

      <Section size="sm">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[17rem_1fr] lg:gap-14">
            <Suspense fallback={<FiltersFallback />}>
              <VehicleFilterRail facets={facets} activeCount={activeCount} />
            </Suspense>

            <div className="min-w-0">
              {/* Results bar: count, filter trigger, sort. */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
                <p className="text-sm text-[var(--muted-foreground)]">
                  <span data-numeric className="font-medium text-[var(--foreground)]">
                    {results.length}
                  </span>{" "}
                  {results.length === 1 ? "vehicle" : "vehicles"}
                  {activeCount > 0 ? (
                    <> of {total}</>
                  ) : (
                    <> available</>
                  )}
                </p>

                <div className="flex items-center gap-3">
                  <Suspense fallback={null}>
                    <VehicleFilterSheet
                      facets={facets}
                      resultCount={results.length}
                      activeCount={activeCount}
                    />
                  </Suspense>
                  <Suspense fallback={null}>
                    <VehicleSort />
                  </Suspense>
                </div>
              </div>

              <div className="pt-5">
                <Suspense fallback={null}>
                  <ActiveFilterChips />
                </Suspense>
              </div>

              {results.length > 0 ? (
                <div className="mt-6 grid gap-px bg-[var(--border)] sm:grid-cols-2 xl:grid-cols-3">
                  {results.map((vehicle, index) => (
                    <VehicleCard
                      key={vehicle.id}
                      vehicle={vehicle}
                      priority={index < 2}
                      className="reveal border-0"
                    />
                  ))}
                </div>
              ) : (
                <EmptyState />
              )}

              <p className="mt-10 text-xs leading-relaxed text-[var(--muted-foreground)]">
                All prices include VAT where applicable.{" "}
                {site.compliance.financeSubjectToStatus}
              </p>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}

function FiltersFallback() {
  return (
    <div className="hidden lg:block">
      <div className="sticky top-28 space-y-6" aria-hidden>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="space-y-3 border-t border-[var(--border)] pt-6">
            <div className="h-2.5 w-20 bg-[var(--muted)]" />
            <div className="h-4 w-full bg-[var(--muted)]" />
            <div className="h-4 w-2/3 bg-[var(--muted)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * No results is a conversion moment, not a dead end — the dealership holds
 * stock it never lists, so this points straight at a person.
 */
function EmptyState() {
  return (
    <div className="mt-6 border border-[var(--border)] px-6 py-16 text-center md:py-24">
      <p className="font-roman text-[0.625rem] uppercase tracking-[0.22em] text-[var(--rule)]">
        Nothing matches — yet
      </p>
      <h2 className="mx-auto mt-5 max-w-lg font-display text-[clamp(1.6rem,3.2vw,2.25rem)] leading-tight">
        We hold more stock than we list online
      </h2>
      <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[var(--muted-foreground)]">
        Cars come and go quickly, and some are sold before they ever reach the
        website. Tell us what you&rsquo;re after and we&rsquo;ll go and find it.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ExternalButtonLink
          href={whatsappLinks.sourcing}
          target="_blank"
          rel="noopener noreferrer"
          variant="whatsapp"
          size="md"
        >
          <WhatsAppIcon className="size-4" />
          Tell us what you want
        </ExternalButtonLink>
        <ExternalButtonLink href={site.phone.href} variant="outline" size="md">
          <Phone className="size-4" />
          {site.phone.display}
        </ExternalButtonLink>
      </div>
    </div>
  );
}
