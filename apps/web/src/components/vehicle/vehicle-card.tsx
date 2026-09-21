import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";
import { formatMileageShort, formatVehiclePrice } from "@/lib/format";
import { whatsappForVehicle } from "@/lib/whatsapp";
import type { PublicVehicle } from "@/lib/inventory/types";
import { WhatsAppIcon } from "@/components/ui/icons";
import { CardPhoto } from "@/components/vehicle/card-photo";

/**
 * The stock card. Carries only what a buyer scans for — photograph, what it
 * is, the three numbers that matter, and the price — then gets out of the way.
 *
 * The whole card is one link (via a stretched overlay) so the tap target on
 * mobile is the entire tile, while the WhatsApp button stays independently
 * clickable above it.
 *
 * On hover the photograph turns the car round (see CardPhoto), the title
 * underlines itself and the arrow tile fills — three quiet signals that the
 * whole card is live, none of which moves the layout.
 */
export function VehicleCard({
  vehicle,
  priority = false,
  sizes = "(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 92vw",
  className,
}: {
  vehicle: PublicVehicle;
  /** Set on the first card or two so the likely LCP image loads eagerly. */
  priority?: boolean;
  /** Rendered width of the card image; the grid that places the card knows it best. */
  sizes?: string;
  className?: string;
}) {
  const { cover, isSold } = vehicle;
  // The second look on hover: the next exterior shot, else the interior.
  const alternate =
    vehicle.images.find((image) => image.id !== cover.id && image.category === "exterior") ??
    vehicle.images.find((image) => image.id !== cover.id);

  return (
    <article
      className={cn(
        "group relative flex flex-col border border-[var(--border)] bg-[var(--surface-raised)]",
        "transition-[border-color,box-shadow] duration-500 ease-[var(--ease-out-expo)]",
        "hover:border-[var(--border-strong)] hover:shadow-[0_28px_60px_-32px_rgb(10_10_11/0.35)]",
        isSold && "opacity-70",
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-ink-950">
        <CardPhoto vehicleId={vehicle.id} cover={cover} alternate={alternate} sizes={sizes} priority={priority} />
        {/* A soft floor so the badges and the frame edge never fight a bright photograph. */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-[linear-gradient(to_bottom,rgb(10_10_11/0.35),transparent)]" />

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
            <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat transition-[background-size] duration-700 ease-[var(--ease-out-expo)] group-hover:bg-[length:100%_1px]">
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
                {formatVehiclePrice(vehicle)}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {!isSold ? (
                <a
                  href={whatsappForVehicle(vehicle)}
                  target="_blank"
                  rel="noopener noreferrer"
                  // Above the stretched link so it stays independently clickable.
                  className="relative z-10 flex size-11 items-center justify-center border border-[var(--border-strong)] text-[var(--foreground)] transition-colors duration-200 hover:border-whatsapp hover:bg-whatsapp hover:text-whatsapp-ink"
                  aria-label={`Message us on WhatsApp about the ${vehicle.year} ${vehicle.title}`}
                >
                  <WhatsAppIcon className="size-[1.05rem]" />
                </a>
              ) : null}
              <span
                aria-hidden
                className={cn(
                  "flex size-11 items-center justify-center overflow-hidden border border-[var(--border-strong)]",
                  "bg-[linear-gradient(var(--primary),var(--primary))] bg-[length:100%_0%] bg-bottom bg-no-repeat",
                  "transition-[background-size,color,border-color] duration-500 ease-[var(--ease-out-expo)]",
                  "group-hover:border-[var(--primary)] group-hover:bg-[length:100%_100%] group-hover:text-[var(--primary-foreground)]",
                )}
              >
                <ArrowUpRight className="size-[1.05rem] transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
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
 * Badges render only when the data warrants one: sold, reserved, a new arrival
 * (listed in the last 30 days), or hand-picked for the homepage.
 */
function VehicleBadges({ vehicle }: { vehicle: PublicVehicle }) {
  const badges: { label: string; tone: "sold" | "reserved" | "new" | "featured" }[] = [];

  if (vehicle.isSold) badges.push({ label: "Sold", tone: "sold" });
  else if (vehicle.reserved) badges.push({ label: "Reserved", tone: "reserved" });
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
            "px-3 py-2 font-roman text-[0.625rem] uppercase tracking-[0.2em]",
            tones[badge.tone],
          )}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}
