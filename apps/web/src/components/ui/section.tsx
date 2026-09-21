import type { ComponentProps, ElementType, ReactNode } from "react";
import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";
import { SplitText, type TextRun } from "@/components/ui/split-text";

/**
 * Layout primitives. Every page composes from these so vertical rhythm and
 * horizontal measure stay identical across the site.
 */

export function Container({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <div className={cn("container-page", className)} {...props}>
      {children}
    </div>
  );
}

interface SectionProps extends Omit<ComponentProps<"section">, "children"> {
  /** Flips the section to the ink palette. Tokens cascade to all children. */
  dark?: boolean;
  /** Slightly warmer than the page background, for alternating bands. */
  tinted?: boolean;
  size?: "sm" | "md" | "lg";
  as?: ElementType;
  children: ReactNode;
}

const sizes = {
  sm: "py-14 md:py-20",
  md: "py-20 md:py-28 lg:py-32",
  lg: "py-24 md:py-32 lg:py-40",
};

export function Section({
  dark = false,
  tinted = false,
  size = "md",
  as: Tag = "section",
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <Tag
      data-surface={dark ? "dark" : undefined}
      className={cn(
        sizes[size],
        // Ink bands carry a fine grain so large dark fields never read flat.
        dark && "grain bg-[var(--background)] text-[var(--foreground)]",
        tinted && !dark && "bg-[var(--surface)]",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

/**
 * Roman capitals in brass, led by a short brass rule. The one flourish that
 * echoes the logo.
 */
export function Eyebrow({ className, children, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "eyebrow flex items-center gap-3 before:h-px before:w-7 before:shrink-0 before:bg-[var(--rule)] before:content-['']",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}

interface SectionHeadingProps {
  eyebrow?: string;
  /**
   * A string, or runs for a two-tone headline (`tone: "muted"` for the quieter
   * half). Either way the words rise into place as the heading scrolls in.
   */
  title: string | TextRun[];
  lede?: ReactNode;
  align?: "start" | "center";
  className?: string;
  /** Renders as h1 on pages where this is the page title. */
  as?: "h1" | "h2";
  /** Right-hand slot for a "view all" link on wide screens. */
  action?: ReactNode;
}

export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = "start",
  className,
  as: Tag = "h2",
  action,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6 md:flex-row md:items-end md:justify-between",
        align === "center" && "md:flex-col md:items-center",
        className,
      )}
    >
      <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center")}>
        {eyebrow ? <Eyebrow className={cn("reveal mb-6", align === "center" && "justify-center")}>{eyebrow}</Eyebrow> : null}
        <SplitText
          as={Tag}
          runs={title}
          className="text-[clamp(2.25rem,5vw,4rem)] leading-[1.02] tracking-[-0.025em]"
        />
        {lede ? (
          <p
            className={cn(
              "reveal mt-6 max-w-xl text-base leading-relaxed text-[var(--muted-foreground)] md:text-lg",
              align === "center" && "mx-auto",
            )}
          >
            {lede}
          </p>
        ) : null}
      </div>
      {action ? <div className="reveal shrink-0">{action}</div> : null}
    </div>
  );
}

/** A 1px rule. Used far more than borders on boxes. */
export function Hairline({ className }: { className?: string }) {
  return <div aria-hidden className={cn("hairline", className)} />;
}
