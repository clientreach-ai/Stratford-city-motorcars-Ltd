/**
 * Editorial content for the finance, part-exchange and trust sections.
 *
 * Every factual claim traces back to the dealership's existing site, FAQs or
 * terms. Where they state a figure (deposit from 10%, terms to 5 years) it is
 * reproduced exactly. No rates, APRs, approval odds or guarantees have been
 * added — those would need to come from the lender.
 *
 * Vehicle hire is intentionally absent: the client confirmed hire is not part
 * of this business (City Chauffeurs handles it).
 */

export interface FinanceProduct {
  key: string;
  name: string;
  abbreviation: string;
  summary: string;
  points: string[];
  bestFor: string;
  ownership: string;
  endOfTerm: string;
}

export const financeProducts: FinanceProduct[] = [
  {
    key: "hp",
    name: "Hire Purchase",
    abbreviation: "HP",
    summary:
      "The most straightforward way to spread the cost. You pay a deposit, then fixed monthly payments across the term. When the last payment clears, the car is yours.",
    points: [
      "Fixed monthly payments for the whole term",
      "Deposit from 10%",
      "Terms up to 5 years",
      "No mileage limits",
    ],
    bestFor: "Buyers who want to own the car outright at the end.",
    ownership: "Transfers to you with the final payment.",
    endOfTerm: "Nothing to decide — the car is yours.",
  },
  {
    key: "pcp",
    name: "Personal Contract Purchase",
    abbreviation: "PCP",
    summary:
      "Monthly payments are lower because part of the car's value is deferred to the end of the agreement. At the end you choose whether to keep it, hand it back or put it towards your next car.",
    points: [
      "Lower monthly payments than Hire Purchase",
      "A guaranteed minimum future value is agreed up front",
      "Flexible options at the end of the term",
      "Part-exchange protection",
    ],
    bestFor: "Buyers who like flexibility and lower monthly payments.",
    ownership: "Stays with the lender until you settle the final payment.",
    endOfTerm:
      "Pay the final balloon payment and keep it, return it, or use any equity towards your next car.",
  },
  {
    key: "loan",
    name: "Personal Loan",
    abbreviation: "Loan",
    summary:
      "An unsecured loan buys the car outright, so you own it from day one and the finance sits separately from the vehicle.",
    points: [
      "You own the car immediately",
      "Fixed interest rates",
      "No mileage restrictions",
      "Quick approvals",
    ],
    bestFor: "Buyers who want immediate, unencumbered ownership.",
    ownership: "Yours from the moment you buy.",
    endOfTerm: "The loan simply ends — there is no balloon payment.",
  },
];

export interface Step {
  title: string;
  detail: string;
}

export const financeSteps: Step[] = [
  {
    title: "Tell us what you're after",
    detail:
      "Send us the vehicle you like, roughly what you can put down, and the monthly figure you're comfortable with.",
  },
  {
    title: "We approach our lenders",
    detail:
      "We're a credit broker, so we put your circumstances to several FCA-regulated lenders rather than a single one.",
  },
  {
    title: "You see the options in writing",
    detail:
      "We come back with what's actually available to you, with the total cost set out — not just the monthly figure.",
  },
  {
    title: "Decide in your own time",
    detail:
      "Nothing is committed until you sign. If the numbers don't work for you, we'll say so.",
  },
];

export const partExchangeSteps: Step[] = [
  {
    title: "Tell us about your vehicle",
    detail:
      "Registration, mileage, service history and anything we should know about its condition. It takes about two minutes.",
  },
  {
    title: "Receive an initial valuation",
    detail:
      "We come back within 24 hours with a realistic figure based on what you've told us.",
  },
  {
    title: "Bring it in for inspection",
    detail:
      "We confirm the valuation in person at the showroom and check the documents. There's free parking on site.",
  },
  {
    title: "Complete your upgrade",
    detail:
      "The agreed value comes straight off the price of your next car, or goes towards your finance deposit.",
  },
];

export const partExchangeChecklist: string[] = [
  "Make, model and year",
  "Current mileage",
  "Service history",
  "General condition, including any damage",
  "Any modifications",
  "Outstanding finance, if there is any",
];

export interface TrustPoint {
  title: string;
  detail: string;
}

/**
 * The "why us" section. Written to say something specific and checkable rather
 * than the usual dealership filler — each point corresponds to a commitment
 * the dealership already makes in its own terms and FAQs.
 */
export const trustPoints: TrustPoint[] = [
  {
    title: "Every car is HPI clear",
    detail:
      "We run a full HPI check on every vehicle before it reaches the forecourt — no outstanding finance, no write-off record, not stolen. You see the result.",
  },
  {
    title: "Inspected before it's listed",
    detail:
      "Multi-point safety and mechanical inspection, then proper preparation. If a car doesn't meet the standard, we don't sell it.",
  },
  {
    title: "AA warranty options to 12 months",
    detail:
      "Cover is available on every car we sell. What's available depends on the vehicle's age and value, and we set it out in full before you buy.",
  },
  {
    title: "Finance through regulated lenders",
    detail:
      "We're a credit broker, not a lender. We put your case to several FCA-regulated finance partners so you can compare what's genuinely open to you.",
  },
  {
    title: "Honest part-exchange valuations",
    detail:
      "An initial figure within 24 hours, confirmed on inspection. If your car is worth less than you hoped, we'll tell you why rather than quietly adjust the new car's price.",
  },
  {
    title: "One small team, start to finish",
    detail:
      "You deal with the same people from first enquiry through to handover. No call centre, no rotating salespeople, no pressure to decide today.",
  },
];
