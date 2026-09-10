import Image from "next/image";

import { ButtonLink, ExternalButtonLink } from "@/components/ui/button";
import { Container, Eyebrow } from "@/components/ui/section";
import { StockSearch } from "@/components/vehicle/stock-search";
import { formatPrice } from "@/lib/format";
import { getAllVehicles, getMakeModelIndex } from "@/lib/inventory/repository";
import { whatsappLinks } from "@/lib/whatsapp";
import { WhatsAppIcon } from "@/components/ui/icons";

const PRICE_BANDS = [
  { value: "15000", label: "Up to £15,000" },
  { value: "25000", label: "Up to £25,000" },
  { value: "40000", label: "Up to £40,000" },
  { value: "60000", label: "Up to £60,000" },
];

export async function Hero() {
  const [vehicles, makeModels] = await Promise.all([
    getAllVehicles(),
    getMakeModelIndex(),
  ]);

  const available = vehicles.filter((vehicle) => vehicle.status !== "sold");
  const cheapest = Math.min(...available.map((vehicle) => vehicle.price));
  const marques = [...new Set(available.map((vehicle) => vehicle.make))];

  const fuels = [...new Set(available.map((vehicle) => vehicle.fuel))].sort();
  const transmissions = [
    ...new Set(available.map((vehicle) => vehicle.transmission)),
  ].sort();

  return (
    <section
      data-surface="dark"
      className="relative overflow-hidden bg-ink-950 text-bone"
    >
      {/* The coupé line lifted from the dealership's own logo, used oversized
          as a watermark. Their mark, their car, no stock imagery required. */}
      <Image
        src="/brand/silhouette-bone.webp"
        alt=""
        aria-hidden
        width={800}
        height={105}
        priority
        className="pointer-events-none absolute -right-[18%] top-[16%] w-[135%] max-w-none opacity-[0.045] md:-right-[6%] md:top-[22%] md:w-[78%]"
      />

      <Container className="relative pb-14 pt-16 md:pb-20 md:pt-24 lg:pt-28">
        <div className="max-w-3xl">
          <Eyebrow>Independent · Stratford, East London</Eyebrow>

          <h1 className="mt-6 text-[clamp(2.6rem,7.4vw,5.25rem)] leading-[0.98] tracking-[-0.025em]">
            Prestige, performance
            <br className="hidden sm:block" />{" "}
            <span className="italic text-brass-bright">and classic</span> motorcars.
          </h1>

          <p className="mt-7 max-w-xl text-base leading-relaxed text-bone/65 md:text-lg">
            {marques.length} marques on the floor in Stratford, from{" "}
            {formatPrice(cheapest)}. Every car HPI clear, inspected and properly
            prepared before we put a price on it.
          </p>

          <div className="mt-9 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">
            <ButtonLink href="/vehicles" size="lg" className="w-full sm:w-auto">
              View stock
            </ButtonLink>
            <ButtonLink
              href="/finance"
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
            >
              Finance your car
            </ButtonLink>
            <ButtonLink
              href="/part-exchange"
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
            >
              Part exchange
            </ButtonLink>
          </div>
        </div>
      </Container>

      {/* Search sits on the seam between the hero and the page below it. */}
      <Container className="relative">
        <div className="border border-bone/15 bg-ink-900/70 backdrop-blur-[2px]">
          <div className="flex items-center justify-between gap-4 border-b border-bone/12 px-4 py-3 md:px-5">
            <p className="font-roman text-[0.625rem] uppercase tracking-[0.22em] text-brass">
              Find your car
            </p>
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

          <StockSearch
            makeModels={makeModels}
            priceBands={PRICE_BANDS}
            fuels={fuels}
            transmissions={transmissions}
            className="p-4 md:p-5"
          />
        </div>
      </Container>

      <div className="h-14 md:h-20" />
    </section>
  );
}
