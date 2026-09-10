import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";
import { formatMileageShort, formatPrice } from "@/lib/format";
import { whatsappForVehicle } from "@/lib/whatsapp";
import type { VehicleView } from "@/lib/inventory/types";
import { PhotoPlate } from "./photo-plate";
import { WhatsAppIcon } from "@/components/ui/icons";

/**
 * The stock card. Carries only what a buyer scans for — photograph, what it
 * is, the three numbers that matter, and the price — then gets out of the way.
 *
 * The whole card is one link (via a stretched overlay) so the tap target on
 * mobile is the entire tile, while the WhatsApp button stays independently
 * clickable above it.
 */
export function VehicleCard({
  vehicle,
  priority = false,
  className,
}: {
  vehicle: VehicleView;
  /** Set on the first card or two so the LCP image is not lazy-loaded. */
  priority?: boolean;
  className?: string;
}) {
  const [cover] = vehicle.displayImages;
  const isSold = vehicle.status === "sold";

  return (
    <article
      className={cn(
        "group relative flex flex-col border border-[var(--border)] bg-[var(--surface-raised)]",
        "transition-colors duration-300 ease-[var(--ease-out-expo)] hover:border-[var(--border-strong)]",
        isSold && "opacity-70",
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-ink-950">
        {cover ? (
          <Image
            src={cover.src}
            alt={cover.alt}
            fill
            priority={priority}
            loading={priority ? undefined : "lazy"}
            sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 92vw"
            className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.035]"
          />
        ) : (
          <PhotoPlate make={vehicle.make} year={vehicle.year} compact />
        )}

        <VehicleBadges vehicle={vehicle} />
      </div>

      <div className="flex flex-1 flex-col p-5 md:p-6">
        <p className="font-roman text-[0.625rem] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
          {vehicle.year} · {vehicle.bodyType}
        </p>

        <h3 className="mt-2.5 font-display text-xl leading-tight md:text-[1.375rem]">
          <Link
            href={`/vehicles/${vehicle.slug}`}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
          >
            <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat transition-[background-size] duration-400 ease-[var(--ease-out-expo)] group-hover:bg-[length:100%_1px]">
              {vehicle.title}
            </span>
          </Link>
        </h3>

        <p
          data-numeric
          className="mt-3 text-[0.8125rem] text-[var(--muted-foreground)]"
        >
          {formatMileageShort(vehicle.mileage)}
          <Dot />
          {vehicle.fuel}
          <Dot />
          {vehicle.transmission}
        </p>

        <div className="mt-auto pt-6">
          <div className="hairline" />
          <div className="flex items-end justify-between gap-4 pt-4">
            <div>
              <p
                data-numeric
                className="font-display text-2xl leading-none md:text-[1.75rem]"
              >
                {formatPrice(vehicle.price)}
              </p>
              <p className="mt-1.5 text-[0.6875rem] text-[var(--muted-foreground)]">
                Finance available
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {!isSold ? (
                <a
                  href={whatsappForVehicle(vehicle)}
                  target="_blank"
                  rel="noopener noreferrer"
                  // Above the stretched link so it stays independently clickable.
                  className="relative z-10 flex size-10 items-center justify-center border border-[var(--border-strong)] text-[var(--foreground)] transition-colors duration-200 hover:border-whatsapp hover:bg-whatsapp hover:text-whatsapp-ink"
                  aria-label={`Message us on WhatsApp about the ${vehicle.year} ${vehicle.title}`}
                >
                  <WhatsAppIcon className="size-[1.05rem]" />
                </a>
              ) : null}
              <span
                aria-hidden
                className="flex size-10 items-center justify-center border border-[var(--border-strong)] transition-colors duration-200 group-hover:border-[var(--primary)] group-hover:bg-[var(--primary)] group-hover:text-[var(--primary-foreground)]"
              >
                <ArrowUpRight className="size-[1.05rem]" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function Dot() {
  return <span aria-hidden className="mx-2 text-[var(--border-strong)]">·</span>;
}

/**
 * Badges render only when the data warrants one. No vehicle currently carries
 * a "new arrival" badge because all seven were listed in May — that is correct
 * behaviour, not a bug.
 */
function VehicleBadges({ vehicle }: { vehicle: VehicleView }) {
  const badges: { label: string; tone: "sold" | "reserved" | "new" | "featured" }[] = [];

  if (vehicle.status === "sold") badges.push({ label: "Sold", tone: "sold" });
  else if (vehicle.status === "reserved") badges.push({ label: "Reserved", tone: "reserved" });
  else if (vehicle.isNewArrival) badges.push({ label: "New arrival", tone: "new" });
  else if (vehicle.featured) badges.push({ label: "Featured", tone: "featured" });

  if (badges.length === 0) return null;

  const tones = {
    sold: "bg-ink-950 text-bone",
    reserved: "bg-brass text-ink-950",
    new: "bg-bone text-ink-950",
    featured: "bg-ink-950/85 text-bone backdrop-blur-[2px]",
  } as const;

  return (
    <div className="absolute left-0 top-0 flex flex-col items-start gap-px">
      {badges.map((badge) => (
        <span
          key={badge.label}
          className={cn(
            "px-3 py-2 font-roman text-[0.5625rem] uppercase tracking-[0.2em]",
            tones[badge.tone],
          )}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}
