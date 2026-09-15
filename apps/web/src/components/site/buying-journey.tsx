import { buyingJourney, paymentMethods } from "@/lib/content/services";

import { Container, Section, SectionHeading } from "@/components/ui/section";

/**
 * Browse → Enquire → View → Buy, as the client described a sale: find a car
 * online, get in touch, arrange a viewing, then paperwork and payment.
 */
export function BuyingJourney({
  tinted = false,
  eyebrow = "How buying works",
  title = "From first look to driving away",
}: {
  tinted?: boolean;
  eyebrow?: string;
  title?: string;
}) {
  return (
    <Section tinted={tinted} size="md">
      <Container>
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          lede="No pressure at any stage. Move at your own pace, and ask as many questions as you like along the way."
        />

        <ol className="mt-14 grid gap-px border border-[var(--border)] bg-[var(--border)] md:grid-cols-2 xl:grid-cols-4">
          {buyingJourney.map((step, index) => (
            <li key={step.label} className="reveal flex flex-col bg-[var(--background)] p-7 md:p-8">
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-roman text-[0.625rem] uppercase tracking-[0.22em] text-[var(--rule)]">
                  {step.label}
                </span>
                <span aria-hidden data-numeric className="font-display text-3xl leading-none text-ink-500">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-6 font-display text-xl leading-snug">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]">{step.detail}</p>
              <ul className="mt-auto flex flex-wrap gap-1.5 pt-6">
                {step.options.map((option) => (
                  <li
                    key={option}
                    className="border border-[var(--border-strong)] px-2 py-1 text-[0.6875rem] leading-none text-[var(--muted-foreground)]"
                  >
                    {option}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-col gap-3 border-t border-[var(--border)] pt-6 text-sm md:flex-row md:items-baseline md:gap-8">
          <h3 className="shrink-0 font-roman text-[0.625rem] uppercase tracking-[0.22em] text-[var(--rule)]">
            Ways to pay
          </h3>
          <p className="leading-relaxed text-[var(--muted-foreground)]">{paymentMethods.join(" · ")}</p>
        </div>
      </Container>
    </Section>
  );
}
