import { site } from "../site";

/**
 * Editorial content for the finance and part-exchange sections.
 *
 * The finance product descriptions were confirmed by the client as accurate
 * ("all three, exactly as described"). Figures such as deposit from 10% and
 * terms up to 5 years are reproduced exactly. Nothing here states that finance
 * is currently arranged, names lenders, or makes approval-speed claims — the
 * client has no lender panel yet and its regulatory wording is unconfirmed.
 * "Quick approvals" was removed from the loan for the same reason.
 *
 * The previous "six commitments" trust list was removed: four of its points
 * (HPI on every car, multi-point inspection, AA warranty, broker/lender panel)
 * contradicted the intake. The client confirmed the three promises (trust and
 * transparency, quality standards, personal service) are right but wants them
 * reordered and rewritten to sound less clichéd — pending their wording.
 *
 * Part-exchange turnaround: the client confirmed the four-step process and
 * that a valuation usually comes back within 24 hours on weekdays. The
 * qualifier is part of the fact and must stay with it.
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

export const partExchangeSteps: Step[] = [
  {
    title: "Tell us about your vehicle",
    detail:
      "Registration, mileage, service history and anything we should know about its condition. It takes about two minutes.",
  },
  {
    title: "Receive an initial valuation",
    detail:
      "We usually come back within 24 hours on weekdays with an initial figure based on what you've told us.",
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

/** What the dealership needs to value a part exchange (client intake). */
export const partExchangeChecklist: string[] = [
  "Registration number",
  "Make, model and year",
  "Mileage",
  "Service history",
  "MOT status",
  "Number of keys",
  "Condition notes, including any damage",
  "Outstanding finance, if there is any",
  "Photos — easiest sent on WhatsApp",
];

/**
 * Practical facts about buying, each confirmed in the client intake: viewings
 * by appointment outside weekday hours, nationwide delivery, and the payment
 * methods the business accepts.
 */
export const buyingFacts: Step[] = [
  {
    title: "Viewings that suit you",
    // Derived from the single hours model in site.ts, never retyped.
    detail: `${site.hours.sentence} ${site.hours.outOfHours}`,
  },
  {
    title: "Delivered nationwide",
    detail:
      "People travel for the right car, and we can bring it to you instead. Ask us about delivery for the car you're interested in.",
  },
  {
    title: "Pay the way that suits you",
    detail:
      "Bank transfer, debit or credit card, cash, finance, or your part exchange plus the balance.",
  },
];
