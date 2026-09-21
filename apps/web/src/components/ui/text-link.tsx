import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";

/**
 * The site's quiet call to action: a brass-ruled link whose rule passes
 * through on hover (retracts right, redraws from the left) while an optional
 * arrow edges forward. For "View all stock", "Directions & opening hours" and
 * similar — anywhere a full button would shout.
 */

const base =
  "link-line group inline-flex items-center gap-2.5 text-sm transition-colors duration-300 hover:text-[var(--accent-text)]";

function Arrow() {
  return (
    <ArrowRight
      aria-hidden
      className="size-4 shrink-0 transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-1"
    />
  );
}

type TextLinkProps = Omit<ComponentProps<typeof Link>, "children"> & {
  children: ReactNode;
  /** Trailing arrow; on by default. */
  arrow?: boolean;
};

/** Internal route, typed by `typedRoutes`. */
export function TextLink({ className, children, arrow = true, ...props }: TextLinkProps) {
  return (
    <Link className={cn(base, className)} {...props}>
      {children}
      {arrow ? <Arrow /> : null}
    </Link>
  );
}

type ExternalTextLinkProps = ComponentProps<"a"> & { arrow?: boolean };

/** `tel:`, `mailto:`, `wa.me`, in-page anchors and other non-route links. */
export function ExternalTextLink({ className, children, arrow = false, ...props }: ExternalTextLinkProps) {
  return (
    <a className={cn(base, className)} {...props}>
      {children}
      {arrow ? <Arrow /> : null}
    </a>
  );
}
