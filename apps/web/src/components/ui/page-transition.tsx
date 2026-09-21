"use client";

import { usePathname } from "next/navigation";
import { ViewTransition, type ReactNode } from "react";

/**
 * Route changes crossfade: the page being left fades out quickly and the new
 * one rises gently into place, while the header stays fixed as the point of
 * reference (see the view-transition rules in styles/motion.css).
 *
 * Keyed on the pathname, so only a real change of page animates — changing
 * the stock filters, submitting a form or refreshing data leaves the page
 * where it is. Browsers without the View Transitions API simply cut.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <ViewTransition key={pathname} enter="page-enter" exit="page-exit" default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
