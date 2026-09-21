import Image from "next/image";
import type { CSSProperties } from "react";
import { ArrowRight } from "lucide-react";

import { HeroShowcase, type HeroSlide } from "@/components/home/hero-showcase";
import { ButtonLink, ExternalButtonLink } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/icons";
import { Container, Eyebrow } from "@/components/ui/section";
import { SplitText, type TextRun } from "@/components/ui/split-text";
import { StockSearch } from "@/components/vehicle/stock-search";
import { formatPrice, formatVehiclePrice } from "@/lib/format";
import { getAvailableVehicles, getFeaturedVehicles, getMakeModelIndex } from "@/lib/inventory/repository";
import type { PublicVehicle } from "@/lib/inventory/types";
import { whatsappLinks } from "@/lib/whatsapp";

/** At most this many hand-picked cars take turns in the hero. */
const HERO_SLIDES = 3;

/** Four confirmed facts, set under the search in place of invented numbers. */
const heroFacts = [
  { term: "Family owned", detail: "Small by choice" },
  { term: "Sports & luxury", detail: "What we trade in" },
  { term: "Finance & part exchange", detail: "Explained plainly" },
  { term: "Nationwide delivery", detail: "Ask for your car" },
];

const headline: TextRun[] = [
  { text: "Sports and luxury cars,", br: true },
  { text: "from a family", tone: "accent" },
  { text: "business." },
];

function toSlide(vehicle: PublicVehicle): HeroSlide {
  return {
    id: vehicle.id,
    href: `/vehicles/${vehicle.slug}`,
    src: vehicle.cover.src,
    alt: vehicle.cover.alt,
    name: `${vehicle.year} ${vehicle.title}`,
    price: formatVehiclePrice(vehicle),
    detail: [vehicle.engine, vehicle.power].filter(Boolean).join(" · ") || undefined,
  };
}

const delay = (ms: number) => ({ "--intro-delay": `${ms}ms` }) as CSSProperties;

/**
 * The homepage opening.
 *
 * With hand-picked cars, their own photographs lead: the headline sits on the
 * ink to the left while the cars take turns on the right (HeroShowcase). With
 * nothing hand-picked there is no photograph to lead with, so the hero stays
 * typographic around the logo's coupé line rather than borrowing stock
 * imagery.
 *
 * Everything above the fold enters with CSS alone — the headline word by word,
 * then the line beneath, then the actions — so nothing waits for JavaScript.
 */
export async function Hero() {
  const [featured, available, makeModels] = await Promise.all([
    getFeaturedVehicles(HERO_SLIDES),
    getAvailableVehicles(),
    getMakeModelIndex(),
  ]);

  // With no published stock the stock summary and the search are left out
  // entirely, rather than rendering "0 marques… from £Infinity" or empty selects.
  const hasStock = available.length > 0;
  const prices = available.flatMap((vehicle) => (vehicle.price === null ? [] : [vehicle.price]));
  const marques = [...new Set(available.map((vehicle) => vehicle.make))];
  const slides = featured.map(toSlide);

  const copy = (
    <Container className={slides.length ? "pb-12 pt-9 md:pt-12 lg:pb-12 lg:pt-28" : "pb-14 pt-16 md:pb-20 md:pt-24 lg:pt-28"}>
      <div className="max-w-[58rem]">
        <Eyebrow className="intro" style={delay(0)}>
          Family owned · Stratford, East London
        </Eyebrow>

        <SplitText
          as="h1"
          play="load"
          delay={120}
          runs={headline}
          className="mt-6 text-[clamp(2.6rem,6.2vw,5.5rem)] leading-[0.98] tracking-[-0.03em]"
        />

        <p className="intro mt-6 max-w-xl text-base leading-relaxed text-bone/70 md:text-lg" style={delay(520)}>
          {hasStock ? (
            <>
              {marques.length} {marques.length === 1 ? "marque" : "marques"} on the floor
              {prices.length ? <>, from {formatPrice(Math.min(...prices))}</> : null}.{" "}
            </>
          ) : null}
          A small family-owned showroom on Romford Road, Stratford. Take your time, ask us anything — every
          enquiry is handled personally.
        </p>

        <div className="intro mt-8 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3" style={delay(640)}>
          <ButtonLink href="/vehicles" size="lg" className="w-full sm:w-auto">
            View cars
            <ArrowRight />
          </ButtonLink>
          <ButtonLink href="/contact#book-a-viewing" variant="outline" size="lg" className="w-full sm:w-auto">
            Book a viewing
          </ButtonLink>
          <ExternalButtonLink
            href={whatsappLinks.browsing}
            target="_blank"
            rel="noopener noreferrer"
            variant="whatsapp"
            size="lg"
            className="w-full sm:w-auto"
          >
            <WhatsAppIcon className="size-4" />
            WhatsApp us
          </ExternalButtonLink>
        </div>
      </div>
    </Container>
  );

  return (
    <section data-surface="dark" className="grain relative overflow-hidden bg-ink-950 text-bone">
      {slides.length ? (
        <HeroShowcase slides={slides}>{copy}</HeroShowcase>
      ) : (
        <>
          {/* The coupé line lifted from the dealership's own logo, used
              oversized as a watermark. Their mark, their car. */}
          <Image
            src="/brand/silhouette-bone.webp"
            alt=""
            aria-hidden
            width={800}
            height={105}
            loading="eager"
            fetchPriority="low"
            sizes="(min-width: 768px) 78vw, 135vw"
            className="animate-intro-fade pointer-events-none absolute -right-[18%] top-[16%] w-[135%] max-w-none opacity-[0.05] md:-right-[6%] md:top-[22%] md:w-[78%]"
          />
          <div className="relative">{copy}</div>
        </>
      )}

      {/* ---- Search and facts: the seam into the page ------------------------ */}
      <div className="relative z-10 border-t border-bone/10 bg-ink-950">
        <Container className="py-8 md:py-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-center lg:gap-14">
            {hasStock ? (
              <div className="border border-bone/15 bg-ink-900/60">
                <div className="flex items-center justify-between gap-4 border-b border-bone/12 px-4 py-3 md:px-5">
                  <p className="font-roman text-[0.625rem] uppercase tracking-[0.22em] text-brass">Find your car</p>
                  <ExternalButtonLink
                    href={whatsappLinks.browsing}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="ghost"
                    size="sm"
                    className="hidden text-bone/70 hover:text-bone sm:inline-flex"
                  >
                    <WhatsAppIcon className="size-3.5" />
                    Or just ask us
                  </ExternalButtonLink>
                </div>
                <StockSearch makeModels={makeModels} className="p-4 md:p-5" />
              </div>
            ) : null}

            <dl className={hasStock ? "grid grid-cols-2 gap-x-6 gap-y-6" : "grid grid-cols-2 gap-x-6 gap-y-6 lg:col-span-2 lg:grid-cols-4"}>
              {heroFacts.map((fact) => (
                <div key={fact.term} className="border-l border-brass/40 pl-4">
                  <dt className="font-display text-base leading-snug text-bone md:text-lg">{fact.term}</dt>
                  <dd className="mt-1 text-xs text-bone/55 md:text-sm">{fact.detail}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Container>
      </div>
    </section>
  );
}
