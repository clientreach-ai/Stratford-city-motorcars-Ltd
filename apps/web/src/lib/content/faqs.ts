import { site } from "../site";

export type FaqCategory = "Sales" | "Visiting";

export interface Faq {
  id: string;
  question: string;
  answer: string;
  category: FaqCategory;
}

/**
 * Originally transcribed from the dealership's `/api/faqs` endpoint on
 * 10 September 2026. The client intake overrides that source:
 *  - hire FAQs were removed (hire is not offered)
 *  - the HPI FAQ was removed (not every car is history checked) and the two
 *    finance FAQs were removed (they described a lender panel that does not
 *    exist yet)
 *  - the warranty and delivery answers use confirmed facts only
 *  - the part-exchange answer no longer promises a 24-hour turnaround or
 *    "competitive valuations", neither of which the intake confirms
 *
 * "Visiting" entries render on the contact page. "Sales" entries are not
 * currently rendered anywhere — FAQ structured data is only emitted where the
 * questions are visible on the page.
 */
export const faqs: Faq[] = [
  {
    id: "faq-003",
    question: "What warranty do you provide?",
    answer: `${site.warranty.statement} Ask us about cover for the car you're interested in.`,
    category: "Sales",
  },
  {
    id: "faq-004",
    question: "Do you accept part-exchange vehicles?",
    answer:
      "Yes. Tell us about your current vehicle and we'll come back to you with an initial figure. The final valuation is confirmed after a physical inspection and can go towards your next car.",
    category: "Sales",
  },
  {
    id: "faq-009",
    question: "Can I view vehicles outside business hours?",
    answer: `Yes. ${site.hours.sentence} ${site.hours.outOfHours}`,
    category: "Visiting",
  },
  {
    id: "faq-010",
    question: "Do you offer delivery services?",
    answer:
      "Yes, we deliver nationwide. Delivery charges may sometimes apply — ask us about delivery for the car you're interested in.",
    category: "Visiting",
  },
];

export function faqsByCategory(...categories: FaqCategory[]): Faq[] {
  return faqs.filter((faq) => categories.includes(faq.category));
}
