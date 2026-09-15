import { site } from "../site";

/**
 * Editorial content for the public site: why buy here, how buying works,
 * finance and part exchange.
 *
 * Source of truth is the client intake (September 2026). The previous website
 * is used only where the intake agrees with it. Specifically:
 *
 *  - Positioning is the client's own: a small family-owned business trading in
 *    sports and luxury cars, a welcoming showroom, pride in the stock and
 *    competitive prices set from the market. No specialist, prestige/classic,
 *    dealer-group or "premier" language.
 *  - The buying journey is the client's description of a sale: find a car
 *    online, call, arrange a viewing, exchange paperwork and funds. Viewings and
 *    test drives are requests the business confirms.
 *  - Finance: the client confirmed the HP, PCP and personal loan descriptions,
 *    but has no lender panel yet and is confirming its regulatory status. So
 *    nothing here says finance is arranged today, names a lender, gives an APR,
 *    a representative example, an approval time, a minimum deposit or a term
 *    range. The old site's "deposit from 10%" and "terms up to 5 years" depend
 *    on a lender that has not been chosen and were removed.
 *  - Part exchange: the client confirmed the four-step process and that an
 *    initial valuation usually comes back within 24 hours on weekdays. The
 *    qualifier is part of the fact and must stay with it.
 *  - The old "three promises" (trust and transparency, quality standards,
 *    personal service) are awaiting the client's reordering and rewording, so
 *    they are not reproduced. `whyBuyHere` uses the client's own answers
 *    instead.
 *
 * Vehicle hire is intentionally absent: hire is not part of this business.
 */

export interface Step {
  title: string;
  detail: string;
}

// ---- Why buy here -------------------------------------------------------------

/** From "Why does someone buy from you rather than the dealer down the road?" */
export const whyBuyHere: Step[] = [
  {
    title: "A family business",
    detail:
      "We're small and family owned, and we like it that way. You deal with the people who own the business, not a sales floor.",
  },
  {
    title: "Sports and luxury cars",
    detail:
      "That's what we trade in. We take pride in the cars we put on the forecourt, and we won't sell something we wouldn't be happy to drive ourselves.",
  },
  {
    title: "A showroom worth the visit",
    detail:
      "We'd rather give you an experience than a car sale. The showroom is welcoming and comfortable, and you're welcome to take your time.",
  },
  {
    title: "Priced from the market",
    detail:
      "Every price is set by looking at the current market. We aim to put the right car in front of you at a competitive price.",
  },
  {
    title: "Enquiries handled personally",
    detail:
      "Call, WhatsApp or send a message and it comes straight to us. No call centre and no chain of hand-offs.",
  },
  {
    title: "Buyers from across the country",
    detail:
      "People travel for the right car. If that's too far, we deliver nationwide — ask about delivery for the car you're interested in.",
  },
];

// ---- The buying journey ---------------------------------------------------------

export interface JourneyStep extends Step {
  label: string;
  options: string[];
}

export const buyingJourney: JourneyStep[] = [
  {
    label: "Browse",
    title: "Find the car",
    detail:
      "Look through the cars on the website. We hold more stock than we list online, so if you don't see it, tell us what you're after.",
    options: ["Current stock online", "Ask what else we have"],
  },
  {
    label: "Enquire",
    title: "Talk to us",
    detail:
      "Call, WhatsApp or send an enquiry about a specific car. Ask us anything — history, condition, what's included and what isn't.",
    options: ["Phone or WhatsApp", "Enquiry form on every car"],
  },
  {
    label: "View",
    title: "See it in person",
    detail: `Request a viewing or a test drive and we'll confirm a time with you. ${site.hours.sentence}`,
    options: ["Viewing requests", "Test drive requests", "Out-of-hours by arrangement"],
  },
  {
    label: "Buy",
    title: "Make it yours",
    detail:
      "If you're happy, we complete the paperwork and payment together. Take the car home from the showroom, or ask us about nationwide delivery.",
    options: ["Finance options explained", "Part exchange welcome", "Nationwide delivery"],
  },
];

/** Payment methods confirmed in the intake. */
export const paymentMethods: string[] = [
  "Bank transfer",
  "Debit card",
  "Credit card",
  "Cash",
  "Finance",
  "Part exchange plus the balance",
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

/** Where the stock comes from (intake: private purchases, trade auctions, main dealer disposals). */
export const stockSources: string[] = [
  "Private purchases",
  "Trade auctions",
  "Main dealer disposals",
];

// ---- Finance -------------------------------------------------------------------------

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
      "A deposit, then fixed monthly payments",
      "The car is yours after the final payment",
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
      "Pay the optional final payment and keep it, return it, or use any equity towards your next car.",
  },
  {
    key: "loan",
    name: "Personal Loan",
    abbreviation: "Loan",
    summary:
      "An unsecured loan buys the car outright, so you own it from day one and the finance sits separately from the vehicle.",
    points: [
      "You own the car immediately",
      "No final payment at the end",
      "No mileage restrictions",
    ],
    bestFor: "Buyers who want immediate, unencumbered ownership.",
    ownership: "Yours from the moment you buy.",
    endOfTerm: "The loan simply ends — there is no final balloon payment.",
  },
];

/** The words buyers meet in any finance quote, explained without figures. */
export const financeTerms: Step[] = [
  {
    title: "Deposit",
    detail:
      "What you put down at the start. A larger deposit means borrowing less, which lowers the monthly payment. A part exchange can count towards it.",
  },
  {
    title: "Term",
    detail:
      "How long the agreement runs, in months. A longer term spreads the cost into smaller payments but usually costs more overall.",
  },
  {
    title: "Monthly payment",
    detail:
      "The fixed amount you pay each month. It depends on the price of the car, your deposit, the term and the lender's rate.",
  },
  {
    title: "Final payment",
    detail:
      "PCP only. The deferred part of the car's value, due at the end if you decide to keep the car. You don't have to pay it if you hand the car back.",
  },
];

// ---- Part exchange -----------------------------------------------------------------

export const partExchangeSteps: Step[] = [
  {
    title: "Send us your car's details",
    detail:
      "Registration, mileage, service history, MOT and anything we should know about its condition. Photos help, and are easiest sent on WhatsApp.",
  },
  {
    title: "We look it over",
    detail:
      "We go through the details and photos you've sent, and come back to you if we need to know more.",
  },
  {
    title: "We come back with a figure",
    detail:
      "Usually within 24 hours on weekdays, by phone or email, with an initial valuation based on what you've told us.",
  },
  {
    title: "It goes towards your next car",
    detail:
      "Bring it in and we confirm the valuation after a short inspection and a look at the documents. The agreed value comes off the price of your next car.",
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
