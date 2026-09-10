import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";

/**
 * Shown where a vehicle has no photography yet.
 *
 * Treated as a deliberate catalogue plate rather than a broken image: ink
 * ground, hairline frame, the marque set large and ghosted, and a line telling
 * the buyer what to do instead. An auction catalogue does exactly this when a
 * lot arrives before the photographer does.
 */
export function PhotoPlate({
  make,
  year,
  className,
  compact = false,
}: {
  make: string;
  year: number;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden bg-ink-950",
        className,
      )}
    >
      {/* Fine diagonal hatch — texture, not decoration. */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.055]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, #F4F1EA 0 1px, transparent 1px 9px)",
        }}
      />

      <div
        aria-hidden
        className={cn(
          "absolute border border-bone/18",
          compact ? "inset-3" : "inset-5 md:inset-7",
        )}
      />

      <div className="relative flex flex-col items-center px-6 text-center">
        <span
          aria-hidden
          className={cn(
            "font-roman uppercase leading-none text-bone/25",
            compact
              ? "text-[clamp(1.1rem,7vw,1.6rem)] tracking-[0.16em]"
              : "text-[clamp(1.4rem,5vw,2.75rem)] tracking-[0.2em]",
          )}
        >
          {make}
        </span>

        {!compact ? (
          <span
            aria-hidden
            className="mt-3 font-display text-[clamp(2.5rem,9vw,5rem)] leading-none text-bone/14"
          >
            {year}
          </span>
        ) : null}

        <span
          className={cn(
            "font-roman uppercase tracking-[0.24em] text-brass",
            compact ? "mt-2.5 text-[0.5rem]" : "mt-6 text-[0.625rem]",
          )}
        >
          Photography to follow
        </span>

        {!compact ? (
          <span className="mt-2 max-w-[18rem] text-xs leading-relaxed text-bone/60">
            Call the showroom to arrange a viewing of this car.
          </span>
        ) : null}
      </div>
    </div>
  );
}
