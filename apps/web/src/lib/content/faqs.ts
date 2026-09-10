export type FaqCategory = "Sales" | "Finance" | "Hire" | "Visiting";

export interface Faq {
  id: string;
  question: string;
  answer: string;
  category: FaqCategory;
}

/**
 * Transcribed from the dealership's `/api/faqs` endpoint on 10 September 2026.
 * Wording is theirs; only the category of the two general entries has been
 * renamed to "Visiting" so they group sensibly on the contact page.
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
    answer:
      "Yes, we offer appointments outside normal business hours for viewings and collections. Our standard hours are Mon-Sat 9am-6pm and Sun 10am-4pm, but we're flexible to accommodate your schedule. Just call to arrange a convenient time.",
    category: "Visiting",
  },
  {
    id: "faq-010",
    question: "Do you offer delivery services?",
    answer:
      "We can arrange vehicle delivery within the London area for an additional fee. This is particularly useful for hire customers who need vehicles delivered to airports, hotels, or business premises. Contact us for delivery rates and availability.",
    category: "Visiting",
  },
  {
    id: "faq-002",
    question: "Can I hire a car the same day?",
    answer:
      "Absolutely! Subject to availability, we offer same-day hire for our full fleet. Just call us before 4pm and we'll have your vehicle ready for collection. All hire vehicles come fully insured with comprehensive cover and 24/7 breakdown assistance.",
    category: "Hire",
  },
  {
    id: "faq-005",
    question: "What are your hire vehicle age requirements?",
    answer:
      "Minimum age is 21 years for most vehicles, with 25+ required for premium and executive categories. You'll need a valid UK or EU driving license held for at least 2 years. Additional drivers can be added to the agreement and must meet the same requirements.",
    category: "Hire",
  },
  {
    id: "faq-007",
    question: "What's included in your hire prices?",
    answer:
      "Our hire rates include comprehensive insurance, unlimited mileage within the daily allowance, 24/7 breakdown cover, and all necessary documentation. Additional mileage is charged at £0.15 per mile. Fuel is on a full-to-full basis.",
    category: "Hire",
  },
];

export function faqsByCategory(...categories: FaqCategory[]): Faq[] {
  return faqs.filter((faq) => categories.includes(faq.category));
}
