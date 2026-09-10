import { Star } from "lucide-react";

import { Container, Eyebrow } from "@/components/ui/section";
import { testimonials } from "@/lib/content/testimonials";

/**
 * Customer words, taken verbatim from the dealership's own records. Presented
 * as an editorial column rather than a carousel — quotes people can actually
 * read beat quotes that slide away before they finish.
 */
export function Testimonials() {
  const featured = testimonials.slice(0, 4);

  return (
    <section className="py-20 md:py-28">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-20">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <Eyebrow>In their words</Eyebrow>
            <h2 className="mt-5 text-[clamp(2rem,4vw,3rem)] leading-[1.06]">
              What our customers say
            </h2>
            <p className="mt-5 text-[var(--muted-foreground)]">
              Buying a car this side of £60,000 comes down to trust. Here is what
              people who have bought from us have said about the experience.
            </p>
          </div>

          <ul className="grid gap-px bg-[var(--border)] sm:grid-cols-2">
            {featured.map((testimonial) => (
              <li
                key={testimonial.id}
                className="reveal flex flex-col bg-[var(--background)] p-7 md:p-8"
              >
                <div
                  className="flex items-center gap-0.5 text-[var(--rule)]"
                  role="img"
                  aria-label={`${testimonial.rating} out of 5 stars`}
                >
                  {Array.from({ length: testimonial.rating }).map((_, index) => (
                    <Star key={index} className="size-3.5 fill-current" aria-hidden />
                  ))}
                </div>

                <blockquote className="mt-5 flex-1">
                  <p className="font-display text-[1.0625rem] leading-[1.6] text-[var(--foreground)]">
                    {testimonial.content}
                  </p>
                </blockquote>

                <figcaption className="mt-7 flex items-center gap-3.5 border-t border-[var(--border)] pt-5">
                  <span
                    aria-hidden
                    className="flex size-10 shrink-0 items-center justify-center border border-[var(--border-strong)] font-roman text-[0.6875rem] tracking-[0.1em] text-[var(--muted-foreground)]"
                  >
                    {testimonial.initials}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {testimonial.name}
                    </span>
                    <span className="block text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                      {testimonial.type}
                    </span>
                  </span>
                </figcaption>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
