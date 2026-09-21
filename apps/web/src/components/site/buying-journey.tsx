import { buyingJourney, paymentMethods } from "@/lib/content/services";

import { Container, Section, SectionHeading } from "@/components/ui/section";

/**
 * Browse → Enquire → View → Buy, as the client described a sale: find a car
 * online, get in touch, arrange a viewing, then paperwork and payment.
 *
 * Set as a route rather than a grid of boxes: a brass line draws across the
 * four stops as the section scrolls in, each stop marked on it, so the order
 * of things reads at a glance. On phones the line runs down the left edge.
 */
export function BuyingJourney({
  tinted = false,
  dark = false,
  eyebrow = "How buying works",
  title = "From first look to driving away",
}: {
  tinted?: boolean;
  dark?: boolean;
  eyebrow?: string;
  title?: string;
}) {
  return (
    <Section tinted={tinted} dark={dark} size="md">
      <Container>
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          lede="No pressure at any stage. Move at your own pace, and ask as many questions as you like along the way."
        />

        <div className="relative mt-16 md:mt-20">
          {/* The route: across on wide screens, down the side on phones. */}
          <div aria-hidden className="absolute bottom-0 left-[5px] top-2 w-px bg-[var(--border)] xl:inset-x-0 xl:bottom-auto xl:top-[5px] xl:h-px xl:w-auto" />
          <div
            aria-hidden
            className="reveal reveal-line absolute left-[5px] top-2 hidden h-px bg-[var(--rule)] xl:inset-x-0 xl:top-[5px] xl:block"
          />

          <ol className="grid gap-12 xl:grid-cols-4 xl:gap-10">
            {buyingJourney.map((step, index) => (
              <li key={step.label} className="reveal relative flex flex-col pl-10 xl:pl-0 xl:pt-12">
                <span
                  aria-hidden
                  className="absolute left-0 top-1.5 size-[11px] rotate-45 border border-[var(--rule)] bg-[var(--background)] xl:top-0"
                />
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-roman text-[0.625rem] uppercase tracking-[0.22em] text-[var(--accent-text)]">
                    {step.label}
                  </span>
                  <span aria-hidden data-numeric className="font-display text-4xl leading-none text-[var(--muted-foreground)]/60">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-2xl leading-snug">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]">{step.detail}</p>
                <ul className="mt-auto flex flex-wrap gap-1.5 pt-6">
                  {step.options.map((option) => (
                    <li
                      key={option}
                      className="border border-[var(--border-strong)] px-2.5 py-1.5 text-[0.6875rem] leading-none text-[var(--muted-foreground)]"
                    >
                      {option}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>

        <div className="reveal mt-14 flex flex-col gap-3 border-t border-[var(--border)] pt-6 text-sm md:flex-row md:items-baseline md:gap-8">
          <h3 className="shrink-0 font-roman text-[0.625rem] uppercase tracking-[0.22em] text-[var(--accent-text)]">
            Ways to pay
          </h3>
          <p className="leading-relaxed text-[var(--muted-foreground)]">{paymentMethods.join(" · ")}</p>
        </div>
      </Container>
    </Section>
  );
}
