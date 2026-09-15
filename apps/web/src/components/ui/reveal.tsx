"use client";

import { useEffect } from "react";

/**
 * One IntersectionObserver for the whole page.
 *
 * Elements with `className="reveal"` are visible in the server HTML. After
 * hydration, any that are still below the viewport are marked
 * `data-reveal="pending"` (hidden) and fade up once when they scroll into view.
 * Elements already on screen are left alone, so nothing above the fold waits
 * for JavaScript and there is no flash of hidden content.
 *
 * Mounting a single observer in the layout keeps this to a few hundred bytes,
 * and elements added later (filter results, for instance) are picked up
 * automatically. Reduced-motion users get no animation at all.
 */
export function RevealObserver() {
  useEffect(() => {
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-reveal", "shown");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );

    const enrol = () => {
      document.querySelectorAll<HTMLElement>(".reveal:not([data-reveal])").forEach((element) => {
        if (element.getBoundingClientRect().top < window.innerHeight) {
          element.setAttribute("data-reveal", "static");
          return;
        }
        element.setAttribute("data-reveal", "pending");
        observer.observe(element);
      });
    };

    enrol();

    // Catch nodes rendered after hydration (filtered stock, opened panels).
    const mutations = new MutationObserver(enrol);
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, []);

  return null;
}
