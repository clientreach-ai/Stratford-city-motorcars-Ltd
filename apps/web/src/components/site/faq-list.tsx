import { Plus } from "lucide-react";

import type { Faq } from "@/lib/content/faqs";

/**
 * FAQs built on native `<details>` — keyboard accessible, works without
 * JavaScript, and the browser handles the open/close state for free. The only
 * custom part is rotating the marker.
 */
export function FaqList({ faqs }: { faqs: Faq[] }) {
  return (
    <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
      {faqs.map((faq) => (
        <details key={faq.id} className="disclosure group">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-6 text-left [&::-webkit-details-marker]:hidden">
            <h3 className="font-display text-lg leading-snug transition-colors duration-300 group-hover:text-[var(--accent-text)] md:text-xl">
              {faq.question}
            </h3>
            <Plus
              aria-hidden
              className="mt-1.5 size-4 shrink-0 text-[var(--accent-text)] transition-transform duration-500 ease-[var(--ease-out-expo)] group-open:rotate-45"
            />
          </summary>
          <p className="max-w-3xl pb-7 pr-10 text-sm leading-relaxed text-[var(--muted-foreground)] md:text-base">
            {faq.answer}
          </p>
        </details>
      ))}
    </div>
  );
}
