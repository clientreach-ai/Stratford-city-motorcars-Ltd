"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, Pause, Play } from "lucide-react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";

export interface HeroSlide {
  id: string;
  href: `/vehicles/${string}`;
  src: string;
  alt: string;
  /** "2022 Ferrari Roma" */
  name: string;
  /** Already formatted: "£164,950" or "POA". */
  price: string;
  /** "3.9L twin-turbo V8 · 620 PS" — whatever the listing holds. */
  detail?: string;
}

/** How long each car holds the screen before the next fades in. */
const HOLD_MS = 7000;

/**
 * The homepage hero's photography: the dealership's own hand-picked cars,
 * one after another.
 *
 * Composition: on wide screens the photograph sits to the right and dissolves
 * into the ink on the left, where the headline lives; on phones it fills the
 * frame behind a deep scrim. Each car eases in with a slow push-in and
 * crossfades to the next. On desktop the photograph drifts a little slower
 * than the page as it scrolls, for depth.
 *
 * Timing lives in CSS: the active progress bar fills over HOLD_MS and its
 * `animationend` advances the show, so pausing is just pausing that
 * animation. The show pauses itself when the hero is off screen, when the
 * visitor presses pause, and never starts for anyone who prefers reduced
 * motion. The first photograph is the page's LCP image and loads with high
 * priority; the rest load behind it.
 */
export function HeroShowcase({ slides, children }: { slides: HeroSlide[]; children: ReactNode }) {
  const [active, setActive] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [offscreen, setOffscreen] = useState(false);
  const [reduced, setReduced] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  const count = slides.length;
  const paused = userPaused || offscreen || reduced;

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // Pause while the hero is out of view.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(([entry]) => setOffscreen(!entry?.isIntersecting), {
      threshold: 0.05,
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  // Depth on scroll: the photograph trails the page slightly. Desktop only,
  // written straight to the element so scrolling never re-renders React.
  useEffect(() => {
    const layer = layerRef.current;
    const root = rootRef.current;
    if (!layer || !root) return;
    const wide = window.matchMedia("(min-width: 1024px)");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const update = () => {
      if (!wide.matches) {
        layer.style.transform = "";
        return;
      }
      const y = Math.min(window.scrollY, root.offsetHeight);
      layer.style.transform = `translate3d(0, ${(y * 0.22).toFixed(1)}px, 0)`;
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    wide.addEventListener("change", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      wide.removeEventListener("change", update);
    };
  }, []);

  const current = slides[active]!;

  const advance = () => {
    // The reduced-motion stylesheet collapses every animation to an instant;
    // never let that turn into a slideshow racing through the cars.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setActive((index) => (index + 1) % count);
  };

  return (
    <div
      ref={rootRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured cars"
      // Phones and tablets: photograph, then its caption, then the copy —
      // a landscape car photograph is never stretched to a portrait screen.
      // Desktop: the photograph fills the right of the hero behind the copy.
      className="relative flex flex-col lg:min-h-[min(calc(100svh-7.5rem),60rem)] lg:justify-end"
    >
      {/* ---- Photography ------------------------------------------------ */}
      <div
        aria-hidden
        className="relative order-1 aspect-[4/3] w-full overflow-hidden sm:aspect-[16/10] md:aspect-[16/9] lg:absolute lg:inset-0 lg:left-[24%] lg:aspect-auto lg:w-auto"
      >
        <div ref={layerRef} className="absolute inset-0 will-change-transform">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={cn(
                "absolute inset-0 transition-opacity duration-[1600ms] ease-[var(--ease-cinema)]",
                index === active ? "opacity-100" : "opacity-0",
              )}
            >
              <Image
                src={slide.src}
                alt=""
                fill
                // The first car is the LCP element; the rest wait their turn.
                priority={index === 0}
                fetchPriority={index === 0 ? "high" : "low"}
                loading={index === 0 ? "eager" : "lazy"}
                sizes="(min-width: 1024px) 76vw, 100vw"
                className={cn(
                  "object-cover object-[center_62%]",
                  index === active && !reduced && "animate-[hero-push_9s_var(--ease-out-expo)_both]",
                )}
              />
            </div>
          ))}
        </div>

        {/* Scrims: headline side and header on wide screens; a deep floor
            and a light ceiling on phones. */}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,var(--color-ink-950)_0%,rgb(10_10_11/0.35)_28%,transparent_55%)] lg:bg-[linear-gradient(90deg,var(--color-ink-950)_0%,rgb(10_10_11/0.72)_22%,rgb(10_10_11/0.08)_58%,rgb(10_10_11/0.2)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 hidden h-2/5 bg-[linear-gradient(to_top,var(--color-ink-950),transparent)] lg:block" />
      </div>

      {/* ---- Copy (server-rendered) -------------------------------------- */}
      <div className="relative z-10 order-3 lg:order-1">{children}</div>

      {/* ---- Caption and controls ---------------------------------------- */}
      <div className="container-page relative z-10 order-2 pt-3 lg:pb-10 lg:pt-0">
        <div className="flex flex-col gap-2 border-b border-bone/12 pb-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:pb-4 lg:border-b-0 lg:border-t lg:border-bone/15 lg:pb-0 lg:pt-5">
          {/* Announce the car only when the visitor is driving the show. */}
          <div aria-live={paused ? "polite" : "off"} className="min-w-0">
          <div key={current.id} className="intro min-w-0" style={{ ["--intro-delay" as string]: "0ms" }}>
            <p className="font-roman text-[0.625rem] uppercase tracking-[0.24em] text-brass">
              Featured{count > 1 ? ` · ${String(active + 1).padStart(2, "0")} / ${String(count).padStart(2, "0")}` : null}
            </p>
            <Link
              href={current.href}
              className="group mt-2 inline-flex max-w-full flex-wrap items-baseline gap-x-3 gap-y-0.5 text-bone sm:flex-nowrap"
            >
              <span className="font-display text-lg leading-snug sm:truncate sm:text-xl md:text-2xl">{current.name}</span>
              <span data-numeric className="shrink-0 text-sm text-bone/70">
                {current.price}
              </span>
              <ArrowUpRight
                aria-hidden
                className="size-4 shrink-0 self-center text-brass transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </Link>
            {current.detail ? <p className="mt-1 truncate text-xs text-bone/55">{current.detail}</p> : null}
          </div>
          </div>

          {count > 1 ? (
            <div className="flex shrink-0 items-center justify-between gap-3">
              <ol className="-ml-1 flex items-center sm:ml-0 sm:gap-2">
                {slides.map((slide, index) => (
                  <li key={slide.id}>
                    <button
                      type="button"
                      onClick={() => setActive(index)}
                      aria-label={`Show the ${slide.name}`}
                      aria-current={index === active}
                      // A 44px tap target around a hairline.
                      className="group flex h-11 w-12 items-center px-1 sm:px-0 md:w-16"
                    >
                      <span className="relative block h-px w-full overflow-hidden bg-bone/25 transition-colors group-hover:bg-bone/45">
                        <span
                          key={index === active ? `run-${active}` : "idle"}
                          onAnimationEnd={index === active ? advance : undefined}
                          className={cn(
                            "absolute inset-0 origin-left bg-brass",
                            index === active
                              ? reduced
                                ? "scale-x-100"
                                : "animate-[hero-progress_linear_both]"
                              : index < active
                                ? "scale-x-100 opacity-40"
                                : "scale-x-0",
                          )}
                          style={
                            index === active && !reduced
                              ? {
                                  animationDuration: `${HOLD_MS}ms`,
                                  animationPlayState: paused ? "paused" : "running",
                                }
                              : undefined
                          }
                        />
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
              {!reduced ? (
                <button
                  type="button"
                  onClick={() => setUserPaused((value) => !value)}
                  aria-label={userPaused ? "Play the featured cars" : "Pause the featured cars"}
                  className="flex size-11 items-center justify-center border border-bone/20 text-bone/80 transition-colors hover:border-bone hover:text-bone"
                >
                  {userPaused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
