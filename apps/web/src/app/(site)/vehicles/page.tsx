import type { Metadata, Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Banknote, CalendarCheck, ChevronLeft, ChevronRight, Repeat } from "lucide-react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";
import { FaqSection } from "@/components/site/faq-section";
import { PageHero } from "@/components/site/page-hero";
import { JsonLd } from "@/components/ui/json-ld";
import { Container, Section } from "@/components/ui/section";
import { StockEmptyState } from "@/components/vehicle/listing-promise";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
import {
  VehicleFilterRail,
  VehicleFilterSheet,
} from "@/components/vehicle/vehicle-filters";
import { ActiveFilterChips, VehicleSort } from "@/components/vehicle/vehicle-sort";
import {
  PAGE_SIZE,
  countActiveFilters,
  describeQuery,
  isNonCanonicalQuery,
  parsePage,
  parseSearchParams,
  toPageSearchString,
} from "@/lib/inventory/query-params";
import { faqsByCategory } from "@/lib/content/faqs";
import { searchVehicles } from "@/lib/inventory/repository";
import type { VehicleQuery } from "@/lib/inventory/types";
import { whatsappLinks } from "@/lib/whatsapp";
import { breadcrumbSchema, itemListSchema, pageMetadata } from "@/lib/seo";

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
  // Any query string — filters, sort, or a stale parameter from the old site —
  // is a variation of the stock page: kept out of the index, canonical /vehicles.
  const filtered = isNonCanonicalQuery(searchParams);

  return {
    ...pageMetadata({
      title: "Sports & Luxury Cars for Sale in East London",
      description:
        "Sports and luxury cars for sale in East London from a small family-owned business in Stratford. Every car photographed inside and out. Finance explained, part exchange welcome, nationwide delivery.",
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
  const summary = describeQuery(query, facets);
  // Stock is listed a page at a time. A page beyond the last one — a stale link
  // or a hand-edited URL — lands on the last page rather than on nothing.
  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const page = Math.min(parsePage(searchParams), pageCount);
  const onThisPage = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  // With no published stock there is nothing to filter or sort: the rail, the
  // filter sheet and the sort control are left out and the empty state takes
  // the full width.
  const hasStock = total > 0;

  return (
    <>
      <JsonLd
        data={
          onThisPage.length > 0
            ? [breadcrumbSchema(crumbs), itemListSchema(onThisPage)]
            : breadcrumbSchema(crumbs)
        }
      />

      <PageHero
        eyebrow="Current stock"
        title={summary ? `${summary}` : "Sports and luxury cars for sale"}
        lede={
          summary
            ? `Showing the ${results.length === 1 ? "one car" : `${results.length} cars`} that match. Adjust the filters to widen your search.`
            : "From a family-owned showroom in Stratford, East London. Every car listed has been photographed inside and out, and we hold more than we list — so if you don't see what you're after, ask."
        }
        crumbs={crumbs}
      />

      <Section size="sm">
        <Container>
          <div className={hasStock ? "grid gap-10 lg:grid-cols-[17rem_1fr] lg:gap-14" : undefined}>
            {hasStock ? (
              <Suspense fallback={<FiltersFallback />}>
                <VehicleFilterRail facets={facets} activeCount={activeCount} />
              </Suspense>
            ) : null}

            <div className="min-w-0">
              {/* Results bar: count, filter trigger, sort. Left out with no stock,
                  where "0 vehicles available" would read as a broken page. */}
              {hasStock ? (
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
              ) : null}

              <div className={hasStock ? "pt-5" : undefined}>
                <Suspense fallback={null}>
                  <ActiveFilterChips />
                </Suspense>
              </div>

              {results.length > 0 ? (
                <h2 className="sr-only">
                  {results.length === 1 ? "1 car" : `${results.length} cars`} for sale
                </h2>
              ) : null}
              {results.length > 0 ? (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {onThisPage.map((vehicle, index) => (
                    <VehicleCard
                      key={vehicle.id}
                      vehicle={vehicle}
                      // Only the first card can be the LCP element on a phone.
                      priority={index === 0}
                      sizes="(min-width: 1280px) 24vw, (min-width: 1024px) 32vw, (min-width: 640px) 46vw, 92vw"
                      className="reveal"
                    />
                  ))}
                </div>
              ) : hasStock ? (
                <NoMatches />
              ) : (
                <StockEmptyState />
              )}

              {pageCount > 1 ? <Pagination query={query} page={page} pageCount={pageCount} /> : null}

              {results.length > 0 ? (
                <p className="mt-10 text-xs leading-relaxed text-[var(--muted-foreground)]">
                  All prices include VAT where applicable.
                </p>
              ) : null}
            </div>
          </div>
        </Container>
      </Section>

      {/* ---- Next steps ------------------------------------------------------ */}
      <Section tinted size="sm">
        <Container>
          <h2 className="sr-only">Buying from us</h2>
          <ul className="grid gap-px border border-[var(--border)] bg-[var(--border)] md:grid-cols-3">
            {nextSteps.map((item) => (
              <li key={item.title} className="bg-[var(--background)]">
                <Link
                  href={item.href}
                  className="group flex h-full flex-col p-7 transition-colors hover:bg-[var(--surface)] md:p-8"
                >
                  <span aria-hidden className="text-[var(--rule)]">
                    {item.icon}
                  </span>
                  <span className="mt-4 font-display text-xl leading-snug">{item.title}</span>
                  <span className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">{item.detail}</span>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm">
                    {item.cta}
                    <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <FaqSection
        faqs={faqsByCategory("Buying")}
        eyebrow="Buying from us"
        title="Questions about buying"
        lede="Anything else, just ask — by phone, WhatsApp or the enquiry form on each car's page."
      />
    </>
  );
}

const nextSteps: { title: string; detail: string; cta: string; href: Route; icon: React.ReactNode }[] = [
  {
    title: "See a car in person",
    detail: "Request a viewing or a test drive and we'll confirm a time with you.",
    cta: "Book a viewing",
    href: "/contact#book-a-viewing",
    icon: <CalendarCheck className="size-5" />,
  },
  {
    title: "Spread the cost",
    detail: "How Hire Purchase, PCP and personal loans work, explained plainly.",
    cta: "Finance explained",
    href: "/finance",
    icon: <Banknote className="size-5" />,
  },
  {
    title: "Part exchange your car",
    detail: "Send us the details and we'll usually come back within 24 hours on weekdays.",
    cta: "Value your car",
    href: "/part-exchange",
    icon: <Repeat className="size-5" />,
  },
];

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
 * Paging through stock. Plain links: page two works with JavaScript switched
 * off and a crawler can follow it, and the filters and sort travel with every
 * link so a paged view stays the view the customer set up.
 */
function Pagination({
  query,
  page,
  pageCount,
}: {
  query: VehicleQuery;
  page: number;
  pageCount: number;
}) {
  const href = (target: number) => `/vehicles${toPageSearchString(query, target)}` as Route;
  const step =
    "flex size-11 items-center justify-center border border-[var(--border-strong)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)]";

  return (
    <nav aria-label="Stock pages" className="mt-10 border-t border-[var(--border)] pt-6">
      <ul className="flex flex-wrap items-center justify-center gap-1.5">
        <li>
          {page > 1 ? (
            <Link href={href(page - 1)} rel="prev" aria-label="Previous page" className={step}>
              <ChevronLeft className="size-4" />
            </Link>
          ) : (
            <span aria-hidden className={cn(step, "border-[var(--border)] text-[var(--muted-foreground)] opacity-40")}>
              <ChevronLeft className="size-4" />
            </span>
          )}
        </li>

        {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
          <li key={number}>
            <Link
              href={href(number)}
              aria-current={number === page ? "page" : undefined}
              data-numeric
              className={cn(
                "flex size-11 items-center justify-center border text-sm transition-colors",
                number === page
                  ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "border-[var(--border-strong)] hover:border-[var(--primary)]",
              )}
            >
              <span className="sr-only">Page </span>
              {number}
            </Link>
          </li>
        ))}

        <li>
          {page < pageCount ? (
            <Link href={href(page + 1)} rel="next" aria-label="Next page" className={step}>
              <ChevronRight className="size-4" />
            </Link>
          ) : (
            <span aria-hidden className={cn(step, "border-[var(--border)] text-[var(--muted-foreground)] opacity-40")}>
              <ChevronRight className="size-4" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}

/** Filters that match nothing, while stock exists: point back at a person. */
function NoMatches() {
  return (
    <div className="mt-6 border border-[var(--border)] px-6 py-16 text-center md:py-20">
      <p className="font-roman text-[0.625rem] uppercase tracking-[0.22em] text-[var(--rule)]">
        Nothing matches — yet
      </p>
      <h2 className="mx-auto mt-5 max-w-lg font-display text-[clamp(1.6rem,3.2vw,2.25rem)] leading-tight">
        We hold more stock than we list online
      </h2>
      <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[var(--muted-foreground)]">
        Try widening the filters, or tell us what you&rsquo;re after and we&rsquo;ll let you know what we
        have.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/vehicles"
          className="inline-flex items-center gap-2 border-b border-[var(--rule)] pb-1 text-sm transition-colors hover:text-[var(--rule)]"
        >
          Clear filters
        </Link>
        <a
          href={whatsappLinks.sourcing}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 border-b border-[var(--rule)] pb-1 text-sm transition-colors hover:text-[var(--rule)]"
        >
          Tell us what you want on WhatsApp
        </a>
      </div>
    </div>
  );
}
