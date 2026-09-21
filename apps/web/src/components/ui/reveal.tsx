"use client";

import { useEffect } from "react";

/** Largest delay any one element waits behind the others revealed with it. */
const MAX_STAGGER_MS = 420;

/** The longest reveal (a photograph) runs about 1.8s. */
const SETTLE_MS = 1900;

type RevealState = "pending" | "shown" | "done" | "static";

/**
 * Scroll reveals for the whole page, replayed every time an element comes
 * back into view.
 *
 * Elements with `className="reveal"` are visible in the server HTML. After
 * hydration, any that are still below the viewport are marked
 * `data-reveal="pending"` (hidden) and animate in as they scroll into view.
 * Elements already on screen are left alone, so nothing above the fold waits
 * for JavaScript and there is no flash of hidden content.
 *
 * Replay: once an element has left the viewport completely it is quietly put
 * back to pending — never while any of it is on screen — and animates again
 * the next time it arrives. It remembers which edge it left by, so an element
 * the visitor scrolls back up to drops in from above rather than rising from
 * below, and a group arriving from above ripples in from the bottom up.
 *
 * Above-the-fold entrances (`intro`, `intro-words`: the hero and page
 * headings) are CSS animations; they are rested while off screen and restart
 * when the visitor scrolls back to them.
 *
 * Variants are extra classes, styled in styles/motion.css:
 *   reveal               rise and fade (default)
 *   reveal reveal-image  photograph opens from an inset mask and settles
 *   reveal reveal-words  headline words rise out of their masks (SplitText)
 *   reveal reveal-line   hairline draws across
 *
 * Elements that arrive in the same frame — a row of cards, a list — are
 * staggered in the order the eye meets them. Once an element has finished
 * revealing it is marked `done`, handing its `transition` back to its own
 * hover styles.
 *
 * Mounting a single pair of observers in the layout keeps this to a few
 * hundred bytes, and elements added later (filter results, a new route) are
 * picked up automatically. Reduced-motion users get no animation at all.
 */
export function RevealObserver() {
  useEffect(() => {
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const enrolled = new WeakSet<Element>();
    const settleTimers = new WeakMap<Element, number>();
    const state = (element: Element) => element.getAttribute("data-reveal") as RevealState | null;

    const settle = (element: HTMLElement, delay: number) => {
      window.clearTimeout(settleTimers.get(element));
      settleTimers.set(
        element,
        window.setTimeout(() => {
          // It may have left the screen and been reset in the meantime.
          if (state(element) !== "shown") return;
          element.setAttribute("data-reveal", "done");
          element.style.removeProperty("--reveal-delay");
        }, delay + SETTLE_MS),
      );
    };

    // Arrival: a little inside the bottom edge, so a reveal is seen to happen.
    const arrive = new IntersectionObserver(
      (entries) => {
        const arriving = entries
          .filter((entry) => entry.isIntersecting && state(entry.target) === "pending")
          .map((entry) => entry.target as HTMLElement);
        if (arriving.length === 0) return;

        // Reading order when scrolling down; nearest-first (bottom up) when
        // the visitor is scrolling back up and things arrive from above.
        const fromAbove = arriving.every((element) => element.dataset.revealFrom === "above");
        arriving.sort((a, b) => {
          const ra = a.getBoundingClientRect();
          const rb = b.getBoundingClientRect();
          const order = Math.round(ra.top - rb.top) || ra.left - rb.left;
          return fromAbove ? -order : order;
        });

        const step = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--stagger")) || 70;

        arriving.forEach((element, index) => {
          const delay = Math.min(index * step, MAX_STAGGER_MS);
          element.style.setProperty("--reveal-delay", `${delay}ms`);
          element.setAttribute("data-reveal", "shown");
          settle(element, delay);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0 },
    );

    // Departure: only once no part of the element is on screen at all, so a
    // reset is never seen.
    const depart = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const element = entry.target as HTMLElement;

          // Above-the-fold CSS entrances: rest while away, restart on return.
          if (element.matches(".intro, .intro-words")) {
            if (entry.isIntersecting) element.removeAttribute("data-intro");
            else element.setAttribute("data-intro", "rest");
            continue;
          }

          if (entry.isIntersecting || state(element) === "pending") continue;
          window.clearTimeout(settleTimers.get(element));
          element.style.removeProperty("--reveal-delay");
          element.dataset.revealFrom = entry.boundingClientRect.bottom <= 0 ? "above" : "below";
          element.setAttribute("data-reveal", "pending");
        }
      },
      { rootMargin: "0px", threshold: 0 },
    );

    const enrol = () => {
      document.querySelectorAll<HTMLElement>(".reveal").forEach((element) => {
        if (enrolled.has(element)) return;
        enrolled.add(element);
        // Whatever an earlier observer left pending (Strict Mode, fast
        // refresh) is judged again from where it sits now.
        if (element.getBoundingClientRect().top < window.innerHeight * 0.92) {
          element.setAttribute("data-reveal", "static");
        } else {
          element.dataset.revealFrom = "below";
          element.setAttribute("data-reveal", "pending");
        }
        arrive.observe(element);
        depart.observe(element);
      });

      document.querySelectorAll<HTMLElement>(".intro, .intro-words").forEach((element) => {
        if (enrolled.has(element)) return;
        enrolled.add(element);
        depart.observe(element);
      });
    };

    enrol();

    // Catch nodes rendered after hydration (filtered stock, a new route).
    const mutations = new MutationObserver(enrol);
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      arrive.disconnect();
      depart.disconnect();
      mutations.disconnect();
      // Nothing is left invisible or resting without an observer to wake it.
      document.querySelectorAll<HTMLElement>('.reveal[data-reveal="pending"]').forEach((element) => {
        element.removeAttribute("data-reveal");
      });
      document.querySelectorAll<HTMLElement>("[data-intro]").forEach((element) => {
        element.removeAttribute("data-intro");
      });
    };
  }, []);

  return null;
}
