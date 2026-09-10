import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";

/**
 * The site's button. Deliberately square (2px radius), generous in height and
 * wide in tracking — it should read as a piece of signage, not a UI control.
 *
 * Variants are written against the semantic tokens, so the same component
 * works unchanged inside a `data-surface="dark"` section.
 */

type Variant = "primary" | "outline" | "ghost" | "brass" | "whatsapp";
type Size = "sm" | "md" | "lg";

const base =
  "group relative inline-flex items-center justify-center gap-2.5 rounded-sm border font-sans font-medium " +
  "uppercase tracking-[0.14em] transition-[background-color,color,border-color,transform] duration-200 " +
  "ease-[var(--ease-out-expo)] select-none whitespace-nowrap " +
  "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--ring)] " +
  "disabled:pointer-events-none disabled:opacity-45 active:translate-y-px " +
  "[&_svg]:size-4 [&_svg]:shrink-0";

const variants: Record<Variant, string> = {
  primary:
    "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)] " +
    "hover:bg-transparent hover:text-[var(--primary)]",
  outline:
    "border-[var(--border-strong)] bg-transparent text-[var(--foreground)] " +
    "hover:border-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)]",
  ghost:
    "border-transparent bg-transparent text-[var(--foreground)] hover:border-[var(--border-strong)]",
  brass:
    "border-[var(--rule)] bg-[var(--rule)] text-[var(--accent-foreground)] " +
    "hover:bg-transparent hover:text-[var(--rule)]",
  // WhatsApp keeps its own green — people recognise it, and that recognition converts.
  whatsapp:
    "border-whatsapp bg-whatsapp text-whatsapp-ink hover:bg-transparent hover:text-whatsapp",
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-3.5 text-[0.6875rem] sm:px-4",
  md: "h-12 px-5 text-xs sm:px-6",
  // Padding tightens below sm: these buttons are `whitespace-nowrap`, so on a
  // 320px handset the horizontal padding is what decides whether the column
  // they sit in can fit at all.
  lg: "h-14 px-6 text-xs sm:px-10",
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
