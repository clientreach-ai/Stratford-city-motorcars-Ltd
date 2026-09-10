import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Route } from "next";
import type { ReactNode } from "react";

import { Container, Eyebrow } from "@/components/ui/section";

export interface Crumb {
  name: string;
  path: string;
}

/**
 * Interior page header. Dark band so every page opens with the same weight as
 * the homepage hero, and the breadcrumb doubles as the visible counterpart to
 * the BreadcrumbList structured data.
 */
export function PageHero({
  eyebrow,
  title,
  lede,
  crumbs,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  crumbs: Crumb[];
  children?: ReactNode;
}) {
  return (
    <section data-surface="dark" className="bg-ink-950 text-bone">
      <Container className="pb-14 pt-8 md:pb-20 md:pt-10">
        <Breadcrumbs crumbs={crumbs} />

        <div className="mt-10 max-w-3xl md:mt-14">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-5 text-[clamp(2.25rem,5.6vw,4rem)] leading-[1.02] tracking-[-0.022em]">
            {title}
          </h1>
          {lede ? (
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-bone/60 md:text-lg">
              {lede}
            </p>
          ) : null}
        </div>

        {children}
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
                  className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
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
