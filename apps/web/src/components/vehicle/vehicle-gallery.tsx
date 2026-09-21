"use client";

import { useCallback, useEffect, useRef, ViewTransition } from "react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";
import { useDialogFocus } from "@/components/ui/use-dialog-focus";
import { carPhotoTransitionName } from "@/components/vehicle/card-photo";
import { VehiclePhoto } from "@/components/vehicle/vehicle-photo";
import type { VehicleImage } from "@/lib/inventory/types";
import { useGalleryStore } from "@/stores/gallery";

const pad = (value: number) => String(value).padStart(2, "0");

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
 *
 * Presentation: the photographs sit on the page's ink stage, wide (2:1 on
 * desktop), with a brass progress rule along the foot of the frame, a counter
 * set in the logo's capitals, and a thumbnail rail whose active frame is
 * underlined in brass. The frame carries the car's view-transition name, so a
 * stock card's photograph travels straight into it.
 *
 * Loading: only the first photograph is fetched eagerly with high priority —
 * it is the page's LCP element. Every other slide and every thumbnail is lazy,
 * and the viewer requests its full-screen image only when opened. `sizes`
 * matches the rendered frame so phones never download desktop widths.
 *
 * Public galleries only ever receive the dealership's own photographs (the
 * publishing rules require them), so there is no placeholder state here.
 */
export function VehicleGallery({
  images,
  title,
  vehicleId,
}: {
  images: VehicleImage[];
  title: string;
  /** Pairs the gallery with the stock card it was opened from. */
  vehicleId: string;
}) {
  const active = useGalleryStore((state) => state.active);
  const setActive = useGalleryStore((state) => state.setActive);
  const lightbox = useGalleryStore((state) => state.lightbox);
  const openLightbox = useGalleryStore((state) => state.openLightbox);
  const closeLightbox = useGalleryStore((state) => state.closeLightbox);
  const reset = useGalleryStore((state) => state.reset);
  const trackRef = useRef<HTMLDivElement>(null);

  const count = images.length;

  // One store serves the page, so a new car must start from its first
  // photograph — car B may not have a sixth. Keyed on the first photograph's
  // id, which is stable across renders in a way the array prop is not.
  const galleryKey = images[0]?.id ?? title;
  useEffect(() => {
    reset();
  }, [galleryKey, reset]);

  const go = useCallback(
    (index: number) => {
      if (count === 0) return;
      const next = (index + count) % count;
      setActive(next);
      const track = trackRef.current;
      if (track) {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        track.scrollTo({ left: track.clientWidth * next, behavior: reduced ? "auto" : "smooth" });
      }
    },
    [count, setActive],
  );

  // Keep counter, rule and thumbnails in step when the track is swiped.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const index = Math.round(track.scrollLeft / track.clientWidth);
        setActive(index);
      });
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [count, setActive]);

  // Arrow keys move through photographs while the viewer is open; focus,
  // Escape and scroll locking are handled inside the viewer.
  useEffect(() => {
    if (!lightbox) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") go(active + 1);
      if (event.key === "ArrowLeft") go(active - 1);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [lightbox, active, go]);

  if (count === 0) return null;

  return (
    <div>
      <ViewTransition name={carPhotoTransitionName(vehicleId)} share="car-photo" default="none">
        <div className="group relative overflow-hidden bg-ink-900">
          <div
            ref={trackRef}
            role="group"
            aria-roledescription="carousel"
            aria-label={`${title} photographs`}
            className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => {
                  setActive(index);
                  openLightbox();
                }}
                // The accessible name starts with what is visible (the photograph's
                // description), then says what the button does.
                aria-label={`${image.alt}. Photograph ${index + 1} of ${count}, view full screen`}
                className="relative aspect-[4/3] w-full shrink-0 snap-center cursor-zoom-in overflow-hidden bg-ink-900 md:aspect-[16/10] lg:aspect-[2/1]"
              >
                <VehiclePhoto
                  src={image.src}
                  alt={image.alt}
                  fill
                  // Only the first photograph is the LCP element.
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "auto"}
                  // The stage is the full container on every breakpoint.
                  sizes="(min-width: 1408px) 1280px, (min-width: 768px) 92vw, 100vw"
                  className="object-cover transition-transform duration-[1400ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.02]"
                />
              </button>
            ))}
          </div>

          {/* Soft floor for the counter and rule. */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(to_top,rgb(10_10_11/0.72),transparent)]" />

          {count > 1 ? (
            <>
              <GalleryArrow side="left" onClick={() => go(active - 1)} label="Previous photograph" />
              <GalleryArrow side="right" onClick={() => go(active + 1)} label="Next photograph" />

              <p
                data-numeric
                aria-hidden
                className="pointer-events-none absolute bottom-5 left-5 font-roman text-[0.6875rem] tracking-[0.24em] text-bone md:bottom-6 md:left-7"
              >
                {pad(active + 1)} <span className="text-bone/50">/ {pad(count)}</span>
              </p>

              {/* Progress rule along the foot of the frame. */}
              <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-bone/15">
                <span
                  className="absolute inset-0 origin-left bg-brass transition-transform duration-700 ease-[var(--ease-out-expo)]"
                  style={{ transform: `scaleX(${(active + 1) / count})` }}
                />
              </span>
            </>
          ) : null}

          <span className="pointer-events-none absolute bottom-5 right-5 hidden items-center gap-2 text-[0.6875rem] uppercase tracking-[0.16em] text-bone/80 opacity-0 transition-opacity duration-500 group-hover:opacity-100 md:bottom-6 md:right-7 md:flex">
            <Expand className="size-3.5" />
            Full screen
          </span>
        </div>
      </ViewTransition>

      {/* Dashes on phones, thumbnails from md — same track either way. */}
      {count > 1 ? (
        <div className="mt-1 flex flex-wrap justify-center md:hidden">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => go(index)}
              aria-label={`Go to photograph ${index + 1}`}
              aria-current={index === active}
              // A 44px tap target around a small bar.
              className="group flex h-11 w-9 items-center justify-center"
            >
              <span
                aria-hidden
                className={cn(
                  "h-0.5 transition-[width,background-color] duration-500 ease-[var(--ease-out-expo)]",
                  index === active ? "w-7 bg-brass" : "w-4 bg-[var(--border-strong)]",
                )}
              />
            </button>
          ))}
        </div>
      ) : null}

      {count > 1 ? (
        <ul className="mt-3 hidden gap-3 md:grid md:grid-cols-6 lg:grid-cols-8">
          {images.map((image, index) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => go(index)}
                aria-label={`Show photograph ${index + 1}`}
                aria-current={index === active}
                className="group/thumb relative block aspect-[4/3] w-full overflow-hidden bg-ink-900"
              >
                <VehiclePhoto
                  src={image.src}
                  alt=""
                  fill
                  loading="lazy"
                  // Thumbnail rail: 6 columns from md, 8 from lg.
                  sizes="(min-width: 1408px) 150px, (min-width: 1024px) 11vw, 15vw"
                  className={cn(
                    "object-cover transition-[opacity,transform] duration-500 ease-[var(--ease-out-expo)]",
                    index === active ? "opacity-100" : "opacity-45 group-hover/thumb:opacity-90",
                    "group-hover/thumb:scale-[1.05]",
                  )}
                />
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-0 bottom-0 h-0.5 origin-left bg-brass transition-transform duration-500 ease-[var(--ease-out-expo)]",
                    index === active ? "scale-x-100" : "scale-x-0",
                  )}
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {lightbox ? (
        <Lightbox images={images} active={active} title={title} onClose={closeLightbox} onGo={go} />
      ) : null}
    </div>
  );
}

function GalleryArrow({ side, onClick, label }: { side: "left" | "right"; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "absolute top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center border border-bone/20",
        "bg-ink-950/45 text-bone backdrop-blur-md transition-[background-color,border-color,opacity] duration-300",
        "hover:border-bone/60 hover:bg-ink-950/80 md:flex",
        // Present but quiet until the frame is hovered or the arrow is focused.
        "md:opacity-70 md:group-hover:opacity-100 md:focus-visible:opacity-100",
        side === "left" ? "left-4 md:left-6" : "right-4 md:right-6",
      )}
    >
      {side === "left" ? <ChevronLeft className="size-5" /> : <ChevronRight className="size-5" />}
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useDialogFocus({ open: true, containerRef: dialogRef, initialFocusRef: closeRef, onClose });

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — photograph ${active + 1} of ${images.length}`}
      data-surface="dark"
      data-lenis-prevent
      // Fades up from nothing as it mounts (@starting-style), no script involved.
      className="lightbox fixed inset-0 z-100 flex flex-col bg-ink-950/97 backdrop-blur-sm"
    >
      <div className="flex shrink-0 items-center justify-between gap-4 px-5 py-4 md:px-8 md:py-5">
        <div className="min-w-0">
          <p className="truncate font-display text-lg text-bone">{title}</p>
          <p data-numeric aria-live="polite" className="font-roman text-[0.625rem] tracking-[0.24em] text-bone/55">
            {pad(active + 1)} / {pad(images.length)}
          </p>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close viewer"
          className="flex size-11 shrink-0 items-center justify-center border border-bone/25 text-bone transition-colors hover:border-bone hover:bg-bone hover:text-ink-950"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="relative flex-1">
        {/* Keyed on the photograph, so each one dissolves in as it arrives. */}
        <div key={image.id} className="lightbox-frame absolute inset-0 md:inset-x-20">
          <VehiclePhoto src={image.src} alt={image.alt} fill sizes="100vw" className="object-contain" />
        </div>

        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => onGo(active - 1)}
              aria-label="Previous photograph"
              className="absolute left-4 top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center border border-bone/25 text-bone transition-colors hover:border-bone hover:bg-bone hover:text-ink-950 md:flex"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => onGo(active + 1)}
              aria-label="Next photograph"
              className="absolute right-4 top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center border border-bone/25 text-bone transition-colors hover:border-bone hover:bg-bone hover:text-ink-950 md:flex"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div className="flex shrink-0 items-center justify-center gap-3 px-5 py-5 md:hidden">
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

      {images.length > 1 ? (
        <ul className="hidden shrink-0 justify-center gap-2 px-8 pb-6 pt-2 md:flex">
          {images.map((thumb, index) => (
            <li key={thumb.id}>
              <button
                type="button"
                onClick={() => onGo(index)}
                aria-label={`Show photograph ${index + 1}`}
                aria-current={index === active}
                className="relative block h-14 w-20 overflow-hidden bg-ink-900"
              >
                <VehiclePhoto
                  src={thumb.src}
                  alt=""
                  fill
                  sizes="80px"
                  className={cn(
                    "object-cover transition-opacity duration-300",
                    index === active ? "opacity-100" : "opacity-40 hover:opacity-80",
                  )}
                />
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-0 bottom-0 h-0.5 origin-left bg-brass transition-transform duration-500 ease-[var(--ease-out-expo)]",
                    index === active ? "scale-x-100" : "scale-x-0",
                  )}
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
