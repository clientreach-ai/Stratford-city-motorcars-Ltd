"use client";

import { useEffect } from "react";

/**
 * One IntersectionObserver for the whole page.
 *
 * Anything with `className="reveal"` fades up once when it scrolls into view.
 * Mounting a single observer in the layout keeps this to a few hundred bytes
 * rather than shipping a wrapper component per animated block, and elements
 * added later (filter results, for instance) are picked up automatically.
 *
 * The CSS honours `prefers-reduced-motion`, so this only ever toggles an
 * attribute — it never animates anything on its own.
 */
export function RevealObserver() {
  useEffect(() => {
    const show = (element: Element) => element.setAttribute("data-shown", "true");

    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      document.querySelectorAll(".reveal").forEach(show);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          show(entry.target);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );

    const observeAll = () => {
      document
        .querySelectorAll(".reveal:not([data-shown])")
        .forEach((element) => observer.observe(element));
    };

    observeAll();

    // Catch nodes rendered after hydration (filtered stock, opened panels).
    const mutations = new MutationObserver(observeAll);
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, []);

  return null;
}
