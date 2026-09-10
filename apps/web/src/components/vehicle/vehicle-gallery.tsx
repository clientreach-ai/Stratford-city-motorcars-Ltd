"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";
import type { VehicleImage } from "@/lib/inventory/types";
import { PhotoPlate } from "./photo-plate";

/**
 * Vehicle gallery.
 *
 * One scroll-snap track serves every breakpoint. Swiping is handled natively
 * by the browser, which feels better than any touch handler and costs nothing,
 * while the arrows and thumbnail rail drive the same track on desktop.
 *
 * A single track matters for more than tidiness: rendering separate mobile and
 * desktop galleries put both in the DOM at once, and the browser downloaded
 * every photograph twice at two different widths.
 */
export function VehicleGallery({
  images,
  make,
  year,
  title,
  isLibrary,
}: {
  images: VehicleImage[];
  make: string;
  year: number;
  title: string;
  /** True when these are stand-ins rather than photographs of this car. */
  isLibrary: boolean;
}) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const count = images.length;

  const go = useCallback(
    (index: number) => {
      if (count === 0) return;
      const next = (index + count) % count;
      setActive(next);
      const track = trackRef.current;
      if (track) {
        track.scrollTo({ left: track.clientWidth * next, behavior: "smooth" });
      }
    },
    [count],
  );

  // Keep counter, dots and thumbnails in step when the track is swiped.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const index = Math.round(track.scrollLeft / track.clientWidth);
        setActive((current) => (current === index ? current : index));
      });
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [count]);

  useEffect(() => {
    if (!lightbox) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightbox(false);
      if (event.key === "ArrowRight") go(active + 1);
      if (event.key === "ArrowLeft") go(active - 1);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [lightbox, active, go]);

  if (count === 0) {
    return (
      <div className="aspect-[4/3] w-full md:aspect-[16/10]">
        <PhotoPlate make={make} year={year} />
      </div>
    );
  }

  return (
    <div>
      <div className="group relative">
        <div
          ref={trackRef}
          role="group"
          aria-roledescription="carousel"
          aria-label={`${title} photographs`}
          className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((image, index) => (
            <button
              key={image.src}
              type="button"
              onClick={() => {
                setActive(index);
                setLightbox(true);
              }}
              aria-label={`View photograph ${index + 1} of ${count} fullscreen`}
              className="relative aspect-[4/3] w-full shrink-0 snap-center cursor-zoom-in bg-ink-950 md:aspect-[16/10]"
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                // Only the first photograph is worth blocking the LCP for.
                priority={index === 0}
                loading={index === 0 ? undefined : "lazy"}
                sizes="(min-width: 1280px) 62vw, (min-width: 1024px) 58vw, 100vw"
                className="object-cover"
              />
            </button>
          ))}
        </div>

        {count > 1 ? (
          <>
            <GalleryArrow
              side="left"
              onClick={() => go(active - 1)}
              label="Previous photograph"
            />
            <GalleryArrow
              side="right"
              onClick={() => go(active + 1)}
              label="Next photograph"
            />
          </>
        ) : null}

        {count > 1 ? (
          <span
            data-numeric
            className="pointer-events-none absolute left-4 top-4 bg-ink-950/70 px-3 py-1.5 text-[0.6875rem] tracking-wide text-bone backdrop-blur-[2px]"
          >
            {active + 1} / {count}
          </span>
        ) : null}

        <span className="pointer-events-none absolute bottom-4 right-4 hidden items-center gap-2 bg-ink-950/70 px-3.5 py-2 text-[0.6875rem] uppercase tracking-[0.14em] text-bone opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100 md:flex">
          <Expand className="size-3.5" />
          Expand
        </span>
      </div>

      {/* Dots on phones, thumbnails from md — same track either way. */}
      {count > 1 ? (
        <div className="mt-3 flex justify-center gap-1.5 md:hidden">
          {images.map((image, index) => (
            <button
              key={image.src}
              type="button"
              onClick={() => go(index)}
              aria-label={`Go to photograph ${index + 1}`}
              aria-current={index === active}
              className={cn(
                "h-1 w-6 transition-colors duration-200",
                index === active
                  ? "bg-[var(--foreground)]"
                  : "bg-[var(--border-strong)]",
              )}
            />
          ))}
        </div>
      ) : null}

      {count > 1 ? (
        <ul className="mt-3 hidden gap-3 md:grid md:grid-cols-5 lg:grid-cols-6">
          {images.map((image, index) => (
            <li key={image.src}>
              <button
                type="button"
                onClick={() => go(index)}
                aria-label={`Show photograph ${index + 1}`}
                aria-current={index === active}
                className={cn(
                  "relative block aspect-[4/3] w-full overflow-hidden border bg-ink-950 transition-colors duration-200",
                  index === active
                    ? "border-[var(--foreground)]"
                    : "border-transparent opacity-65 hover:opacity-100",
                )}
              >
                <Image
                  src={image.src}
                  alt=""
                  fill
                  loading="lazy"
                  sizes="160px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {isLibrary ? (
        <p className="mt-4 border-l border-[var(--rule)] pl-3.5 text-xs leading-relaxed text-[var(--muted-foreground)]">
          Library image of the same model, shown while our own photography of
          this car is prepared.{" "}
          {images[active]?.credit ? (
            <>
              Photograph by {images[active]!.credit!.author},{" "}
              <a
                href={images[active]!.credit!.licenseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                {images[active]!.credit!.license}
              </a>
              .{" "}
            </>
          ) : null}
          Call us for photographs of the actual vehicle.
        </p>
      ) : null}

      {lightbox ? (
        <Lightbox
          images={images}
          active={active}
          title={title}
          onClose={() => setLightbox(false)}
          onGo={go}
        />
      ) : null}
    </div>
  );
}

function GalleryArrow({
  side,
  onClick,
  label,
}: {
  side: "left" | "right";
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "absolute top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center",
        "bg-ink-950/60 text-bone backdrop-blur-[2px] transition-colors duration-200",
        "hover:bg-ink-950 md:flex",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      {side === "left" ? (
        <ChevronLeft className="size-5" />
      ) : (
        <ChevronRight className="size-5" />
      )}
    </button>
  );
}

function Lightbox({
  images,
  active,
  title,
  onClose,
  onGo,
}: {
  images: VehicleImage[];
  active: number;
  title: string;
  onClose: () => void;
  onGo: (index: number) => void;
}) {
  const image = images[active]!;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — photograph ${active + 1} of ${images.length}`}
      className="fixed inset-0 z-100 flex flex-col bg-ink-950/97"
    >
      <div className="flex shrink-0 items-center justify-between px-5 py-4">
        <span data-numeric className="text-xs tracking-wide text-bone/60">
          {active + 1} / {images.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          autoFocus
          aria-label="Close viewer"
          className="flex size-11 items-center justify-center border border-bone/25 text-bone transition-colors hover:border-bone hover:bg-bone hover:text-ink-950"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="relative flex-1">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="100vw"
          className="object-contain"
        />
      </div>

      {images.length > 1 ? (
        <div className="flex shrink-0 items-center justify-center gap-3 px-5 py-5">
          <button
            type="button"
            onClick={() => onGo(active - 1)}
            aria-label="Previous photograph"
            className="flex size-11 items-center justify-center border border-bone/25 text-bone transition-colors hover:border-bone hover:bg-bone hover:text-ink-950"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => onGo(active + 1)}
            aria-label="Next photograph"
            className="flex size-11 items-center justify-center border border-bone/25 text-bone transition-colors hover:border-bone hover:bg-bone hover:text-ink-950"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
