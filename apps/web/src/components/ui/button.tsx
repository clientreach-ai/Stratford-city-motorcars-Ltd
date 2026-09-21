import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";

/**
 * The site's button. Deliberately square (2px radius), generous in height and
 * wide in tracking — it should read as a piece of signage, not a UI control.
 *
 * On hover a fill sweeps across from the left (`btn-sweep` in
 * styles/motion.css) instead of the colour simply flipping, and a trailing
 * arrow edges forward. Each variant names its sweep colour in `--sweep`.
 *
 * Variants are written against the semantic tokens, so the same component
 * works unchanged inside a `data-surface="dark"` section.
 */

type Variant = "primary" | "outline" | "ghost" | "brass" | "whatsapp";
type Size = "sm" | "md" | "lg";

const base =
  "btn-sweep group relative inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-sm border font-sans font-medium " +
  // One line from sm up; on a phone a long label may wrap rather than push
  // its column past the edge of the screen.
  "uppercase tracking-[0.14em] select-none text-center leading-snug sm:whitespace-nowrap " +
  "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--ring)] " +
  "disabled:pointer-events-none disabled:opacity-45 active:translate-y-px " +
  "[&_svg]:size-4 [&_svg]:shrink-0 " +
  "[&_svg:is(.lucide-arrow-right,.lucide-arrow-up-right)]:transition-transform " +
  "[&_svg:is(.lucide-arrow-right,.lucide-arrow-up-right)]:duration-500 " +
  "[&_svg:is(.lucide-arrow-right,.lucide-arrow-up-right)]:ease-[var(--ease-out-expo)] " +
  "hover:[&_svg.lucide-arrow-right]:translate-x-1 " +
  "hover:[&_svg.lucide-arrow-up-right]:translate-x-0.5 hover:[&_svg.lucide-arrow-up-right]:-translate-y-0.5";

const variants: Record<Variant, string> = {
  // Ink on bone (bone on ink); brass sweeps in.
  primary:
    "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)] [--sweep:var(--rule)] " +
    "hover:border-[var(--rule)] hover:text-[var(--accent-foreground)]",
  outline:
    "border-[var(--border-strong)] bg-transparent text-[var(--foreground)] [--sweep:var(--primary)] " +
    "hover:border-[var(--primary)] hover:text-[var(--primary-foreground)]",
  ghost:
    "border-transparent bg-transparent text-[var(--foreground)] " +
    "[--sweep:color-mix(in_oklab,var(--foreground)_7%,transparent)] hover:border-[var(--border-strong)]",
  brass:
    "border-[var(--rule)] bg-[var(--rule)] text-[var(--accent-foreground)] [--sweep:var(--primary)] " +
    "hover:border-[var(--primary)] hover:text-[var(--primary-foreground)]",
  // WhatsApp keeps its own green — people recognise it, and that recognition converts.
  whatsapp:
    "border-whatsapp bg-whatsapp text-whatsapp-ink [--sweep:color-mix(in_oklab,var(--color-whatsapp)_72%,black)]",
};

const sizes: Record<Size, string> = {
  // Minimum rather than fixed heights, so a label that wraps on a phone grows
  // the button instead of spilling out of it. On one line they are unchanged.
  sm: "min-h-10 px-3.5 py-2 text-[0.6875rem] sm:px-4",
  md: "min-h-12 px-5 py-2.5 text-xs sm:px-6",
  // Padding tightens below sm so the column a button sits in can fit on a
  // 320px handset.
  lg: "min-h-14 px-6 py-3 text-xs sm:px-10",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: Omit<CommonProps, "children">): string {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = CommonProps & Omit<ComponentProps<"button">, "className" | "children">;

export function Button({ variant, size, className, children, ...props }: ButtonProps) {
  return (
    <button className={buttonClasses({ variant, size, className })} {...props}>
      {children}
    </button>
  );
}

type ButtonLinkProps = CommonProps &
  Omit<ComponentProps<typeof Link>, "className" | "children">;

/** Internal navigation. Typed against the app's routes by `typedRoutes`. */
export function ButtonLink({ variant, size, className, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses({ variant, size, className })} {...props}>
      {children}
    </Link>
  );
}

type ExternalButtonLinkProps = CommonProps &
  Omit<ComponentProps<"a">, "className" | "children">;

/** `tel:`, `mailto:` and `wa.me` links, which are not app routes. */
export function ExternalButtonLink({
  variant,
  size,
  className,
  children,
  ...props
}: ExternalButtonLinkProps) {
  return (
    <a className={buttonClasses({ variant, size, className })} {...props}>
      {children}
    </a>
  );
}
