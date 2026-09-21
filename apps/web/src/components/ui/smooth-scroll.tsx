"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Weighted, eased wheel scrolling for mouse and trackpad users.
 *
 * Deliberately narrow:
 *  - Only on fine pointers with hover. Touch keeps the platform's own native
 *    scrolling, which no script improves on.
 *  - Never when the visitor prefers reduced motion.
 *  - Lenis moves the real window scroll, so `position: sticky`, the reveal
 *    observer and the browser's own scroll restoration all keep working.
 *
 * Page locks: the drawers, sheets and photo viewer lock the page by setting
 * `overflow: hidden` on <body>. Lenis is paused while that holds, so the
 * wheel never scrolls the page behind an open dialog.
 *
 * In-page links (`#enquire`, `#book-viewing`) are glided to rather than
 * jumped to, landing where the target's own `scroll-margin-top` says, and the
 * hash still changes and fires `hashchange` so the enquiry form can open on
 * a viewing request.
 */
export function SmoothScroll() {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || reduced.matches) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      // Nested scrollers (the filter rail, the photo viewer) scroll themselves.
      prevent: (node) => node.closest?.("[data-lenis-prevent]") !== null,
    });
    lenisRef.current = lenis;

    let frame = requestAnimationFrame(function loop(time) {
      lenis.raf(time);
      frame = requestAnimationFrame(loop);
    });

    // Pause while a dialog holds the page still.
    const syncLock = () => {
      if (document.body.style.overflow === "hidden") lenis.stop();
      else lenis.start();
    };
    const lockWatcher = new MutationObserver(syncLock);
    lockWatcher.observe(document.body, { attributes: true, attributeFilter: ["style"] });

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const link = (event.target as Element).closest?.<HTMLAnchorElement>('a[href^="#"]');
      const hash = link?.getAttribute("href");
      if (!link || !hash || hash === "#") return;
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (!target) return;

      event.preventDefault();
      const margin = Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
      if (window.location.hash !== hash) {
        history.pushState(null, "", hash);
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      }
      // Measure against the real scroll position, and bring Lenis up to date
      // with it first: a native scroll it has not seen yet (keyboard, find in
      // page, a focus jump) would otherwise throw the glide short.
      const destination = target.getBoundingClientRect().top + window.scrollY - margin;
      lenis.scrollTo(window.scrollY, { immediate: true, force: true });
      lenis.scrollTo(destination, {
        onComplete: () => {
          // Keyboard and screen-reader users follow the link to where it went.
          const focusable = target.matches("a, button, input, select, textarea, [tabindex]");
          if (!focusable) target.setAttribute("tabindex", "-1");
          target.focus({ preventScroll: true });
        },
      });
    };
    document.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(frame);
      lockWatcher.disconnect();
      document.removeEventListener("click", onClick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // A new page may be a different height; let Lenis measure it again.
  useEffect(() => {
    lenisRef.current?.resize();
  }, [pathname]);

  return null;
}
