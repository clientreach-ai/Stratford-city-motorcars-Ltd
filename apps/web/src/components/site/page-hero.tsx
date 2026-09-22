import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

import { Container, Eyebrow } from "@/components/ui/section";
import { SplitText, type TextRun } from "@/components/ui/split-text";

export interface Crumb {
  name: string;
  path: string;
}

/**
 * Interior page header. Dark band so every page opens with the same weight as
 * the homepage hero, and the breadcrumb doubles as the visible counterpart to
 * the BreadcrumbList structured data.
 *
 * Enters like the homepage: the headline word by word, then the lede, with CSS
 * alone. The logo's coupé line sits faintly behind as the one brand mark.
 */
export function PageHero({
  eyebrow,
  title,
  lede,
  crumbs,
  children,
}: {
  eyebrow: string;
  title: string | TextRun[];
  lede?: ReactNode;
  crumbs: Crumb[];
  children?: ReactNode;
}) {
  return (
    <section data-surface="dark" className="grain relative overflow-hidden border-b border-brass/12 bg-ink-950 text-bone">
      <Image
        src="/brand/silhouette-bone.webp"
        alt=""
        aria-hidden
        width={800}
        height={105}
        sizes="(min-width: 1024px) 60vw, 120vw"
        // Tiny (the file is 800 px), but on wide screens its painted area makes
        // it the largest element, so it must never wait to be lazy-loaded.
        loading="eager"
        fetchPriority="low"
        className="animate-intro-fade pointer-events-none absolute -right-[30%] bottom-6 w-[120%] max-w-none opacity-[0.045] lg:-right-[4%] lg:bottom-10 lg:w-[60%]"
      />
      <Container className="relative pb-16 pt-8 md:pb-24 md:pt-10">
        <Breadcrumbs crumbs={crumbs} />

        <div className="mt-12 max-w-4xl md:mt-20">
          <Eyebrow className="intro">{eyebrow}</Eyebrow>
          <SplitText
            as="h1"
            play="load"
            delay={80}
            runs={title}
            className="mt-6 text-[clamp(2.5rem,6.2vw,5rem)] leading-[1] tracking-[-0.028em]"
          />
          {lede ? (
            <p
              className="intro mt-7 max-w-2xl text-base leading-relaxed text-bone/65 md:text-lg"
              style={{ "--intro-delay": "380ms" } as CSSProperties}
            >
              {lede}
            </p>
          ) : null}
        </div>

        {children ? (
          <div className="intro" style={{ "--intro-delay": "480ms" } as CSSProperties}>
            {children}
          </div>
        ) : null}
      </Container>
    </section>
  );
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-[0.6875rem] uppercase tracking-[0.12em]">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={crumb.path} className="flex items-center gap-1.5">
              {index > 0 ? (
                <ChevronRight
                  aria-hidden
                  className="size-3 text-[var(--muted-foreground)]"
                />
              ) : null}
              {isLast ? (
                <span aria-current="page" className="text-[var(--muted-foreground)]">
                  {crumb.name}
                </span>
              ) : (
                <Link
                  href={crumb.path as Route}
                  className="inline-block py-1.5 text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                >
                  {crumb.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
