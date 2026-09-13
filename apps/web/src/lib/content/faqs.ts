import { site } from "../site";

export type FaqCategory = "Sales" | "Finance" | "Visiting";

export interface Faq {
  id: string;
  question: string;
  answer: string;
  category: FaqCategory;
}

/**
 * Originally transcribed from the dealership's `/api/faqs` endpoint on
 * 10 September 2026. The client intake overrides that source: hire FAQs were
 * removed (hire is not offered) and the delivery answer reflects the confirmed
 * nationwide delivery. The two general entries use the "Visiting" category so
 * they group sensibly on the contact page.
 */
export const faqs: Faq[] = [
  {
    id: "faq-006",
    question: "Are all your vehicles HPI checked?",
    answer:
      "Yes, every vehicle undergoes comprehensive HPI checks to ensure they are not stolen, written off, or have outstanding finance. We also provide full service history documentation and conduct multi-point safety inspections before sale.",
    category: "Sales",
  },
  {
    id: "faq-003",
    question: "What warranty do you provide?",
    answer:
      "All our vehicles come with comprehensive AA warranty options up to 12 months. We also ensure every car is HPI clear and fully inspected before sale. Warranty coverage varies by vehicle age and value, with full details provided at point of sale.",
    category: "Sales",
  },
  {
    id: "faq-004",
    question: "Do you accept part-exchange vehicles?",
    answer:
      "Yes, we welcome part-exchange vehicles and offer competitive valuations. Simply provide details of your current vehicle and we'll give you an initial quote within 24 hours. Final valuation is subject to physical inspection and can be used as a deposit towards your new purchase.",
    category: "Sales",
  },
  {
    id: "faq-001",
    question: "Do you offer finance options?",
    answer:
      "Yes, we work with FCA-regulated partners to offer flexible finance terms with quick decisions. We can often provide same-day approvals for qualified customers. Options include Hire Purchase, Personal Contract Purchase (PCP), and personal loans with competitive interest rates.",
    category: "Finance",
  },
  {
    id: "faq-008",
    question: "How quickly can finance be approved?",
    answer:
      "Most finance applications receive a decision within hours, often on the same day. We work with multiple FCA-regulated lenders to find the best rates and terms for your circumstances. Pre-approval is available to help you shop with confidence.",
    category: "Finance",
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
