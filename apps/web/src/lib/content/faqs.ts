import { site } from "../site";

export type FaqCategory = "Buying" | "Visiting" | "Finance" | "Part exchange";

export interface Faq {
  id: string;
  question: string;
  answer: string;
  category: FaqCategory;
  /** Shown in the homepage FAQ. */
  home?: boolean;
}

/**
 * Questions buyers actually ask, answered only with what the client intake
 * supports. Where the answer depends on the individual car or on a provider
 * that is not set up yet, the answer says so instead of inventing a policy.
 *
 * Deliberately not answered here (see docs/STRATFORD_MIGRATION_AUDIT.md):
 *  - hire of any kind — not part of this business
 *  - "every car is HPI clear" — the client said most, not all, are checked
 *  - lenders, APR, approval speed, minimum deposit, term range — no lender
 *    panel exists yet
 *  - reply times — the client did not confirm one for general enquiries
 *  - negotiation, fees and returns wording — awaiting the client
 *
 * FAQ structured data is emitted only on pages where these questions are
 * visible.
 */
export const faqs: Faq[] = [
  {
    id: "what-cars",
    question: "What cars do you sell?",
    answer:
      "Sports and luxury cars. Our stock changes all the time and we hold more than we list online, so if you're looking for something in particular, tell us and we'll let you know what we have.",
    category: "Buying",
    home: true,
  },
  {
    id: "viewing",
    question: "Can I arrange a viewing?",
    answer: `Yes. Request a viewing from any car's page, call us or message us on WhatsApp, and we'll confirm a time with you. ${site.hours.sentence}`,
    category: "Visiting",
    home: true,
  },
  {
    id: "test-drive",
    question: "Can I book a test drive?",
    answer:
      "You can request one from the car's page or by getting in touch. Test drives are arranged individually, so we'll confirm the details with you for the car you're interested in.",
    category: "Visiting",
    home: true,
  },
  {
    id: "out-of-hours",
    question: "Can I view a car outside opening hours?",
    answer: `Yes. ${site.hours.outOfHours} We'll do our best to find a time that works.`,
    category: "Visiting",
    home: true,
  },
  {
    id: "finance",
    question: "Do you offer finance?",
    answer:
      "Finance is one of the ways you can pay. Our finance page explains how Hire Purchase, Personal Contract Purchase and personal loans work. Send us a finance enquiry for the car you're interested in and we'll talk you through the options.",
    category: "Finance",
    home: true,
  },
  {
    id: "finance-credit-check",
    question: "Does sending a finance enquiry affect my credit score?",
    answer:
      "No. The enquiry form simply tells us what you're looking for — it doesn't run a credit check. Any finance application is a separate step that you would agree to first.",
    category: "Finance",
  },
  {
    id: "finance-deposit",
    question: "Can my part exchange go towards a finance deposit?",
    answer:
      "Yes. The agreed value of your part exchange can go towards your deposit, or come straight off the price if you're paying another way.",
    category: "Finance",
  },
  {
    id: "part-exchange",
    question: "Do you accept part exchange?",
    answer:
      "Yes. Tell us about your current car and we'll usually come back within 24 hours on weekdays with an initial figure. The valuation is confirmed after we've inspected the car and seen the documents.",
    category: "Part exchange",
    home: true,
  },
  {
    id: "part-exchange-finance",
    question: "Can I part exchange a car that still has finance on it?",
    answer:
      "Tell us about any outstanding finance when you send the details. It has to be disclosed and settled before a part exchange completes.",
    category: "Part exchange",
  },
  {
    id: "part-exchange-photos",
    question: "Do I need to send photos?",
    answer:
      "They aren't required, but they help us give an initial figure that's closer to the final one. The easiest way is to send them on WhatsApp.",
    category: "Part exchange",
  },
  {
    id: "delivery",
    question: "Can you deliver nationwide?",
    answer:
      "Yes, we deliver nationwide. A delivery charge may apply depending on the car and where it's going, so ask us for the car you're interested in.",
    category: "Buying",
    home: true,
  },
  {
    id: "reserve",
    question: "Can I reserve a car?",
    answer:
      "Online reservation isn't available yet. If you've found a car you want, call or WhatsApp us and we'll talk about the next steps.",
    category: "Buying",
    home: true,
  },
  {
    id: "warranty",
    question: "Do cars come with warranty cover?",
    answer: `${site.warranty.statement} Whether cover is available, and for how long, depends on the car — ask us about the one you're interested in.`,
    category: "Buying",
    home: true,
  },
  {
    id: "history",
    question: "Are your cars history checked?",
    answer:
      "Each car's page shows the history-check status we hold for it, along with its service and MOT history where we have them. If something isn't shown, ask us before you buy.",
    category: "Buying",
  },
  {
    id: "payment",
    question: "How can I pay?",
    answer:
      "Bank transfer, debit card, credit card, cash, finance, or your part exchange plus the balance.",
    category: "Buying",
  },
  {
    id: "parking",
    question: "Is there parking at the showroom?",
    answer: `Yes, there's free parking on site at ${site.address.full}.`,
    category: "Visiting",
  },
];

export function faqsByCategory(...categories: FaqCategory[]): Faq[] {
  return faqs.filter((faq) => categories.includes(faq.category));
}

export const homeFaqs = (): Faq[] => faqs.filter((faq) => faq.home);
