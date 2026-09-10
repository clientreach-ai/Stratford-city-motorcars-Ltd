/**
 * Single source of truth for the dealership's business facts.
 *
 * Every value here was taken from the live Stratford City Motorcars site or its
 * public API. Nothing is invented. Where a fact could not be verified it is
 * marked `null` and the UI omits it rather than guessing.
 *
 * The geo coordinates are the one deliberate correction: the previous site
 * published 51.5365 / 0.0040, which sits roughly 650m from the showroom. The
 * values below were resolved from the E15 4LJ postcode via postcodes.io and
 * cross-checked against OpenStreetMap.
 */

const RAW_PHONE = "+447722116355";

export const site = {
  /** Brand name as it is set in the logo ("MOTORCARS", one word). */
  name: "Stratford City Motorcars",
  /** Used where a longer, more formal reading suits the sentence. */
  longName: "Stratford City Motorcars",
  tagline: "Prestige, performance and classic motorcars in Stratford, East London",

  /**
   * Canonical origin. Override per environment with NEXT_PUBLIC_SITE_URL —
   * the client currently trades on the .com; their old markup referenced a
   * .co.uk that does not resolve.
   */
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.stratfordcitymotorcars.com").replace(/\/$/, ""),

  phone: {
    display: "+44 7722 116355",
    href: `tel:${RAW_PHONE}`,
    e164: RAW_PHONE,
  },

  whatsapp: {
    /** International format, no leading + or spaces — required by wa.me. */
    number: "447722116355",
    display: "+44 7722 116355",
  },

  email: "stratfordcitymotorcars@gmail.com",

  address: {
    street: "21-25 Romford Road",
    locality: "Stratford",
    region: "London",
    postcode: "E15 4LJ",
    country: "GB",
    /** Single-line form for links, map queries and schema. */
    full: "21-25 Romford Road, Stratford, London E15 4LJ",
  },

  geo: {
    latitude: 51.542405,
    longitude: 0.005234,
  },

  /** Sat nav sometimes routes better to the adjacent postcode — their own guidance. */
  satNavPostcode: "E15 2BX",

  openingHours: [
    { day: "Monday", opens: "09:00", closes: "18:00" },
    { day: "Tuesday", opens: "09:00", closes: "18:00" },
    { day: "Wednesday", opens: "09:00", closes: "18:00" },
    { day: "Thursday", opens: "09:00", closes: "18:00" },
    { day: "Friday", opens: "09:00", closes: "18:00" },
    { day: "Saturday", opens: "09:00", closes: "18:00" },
    { day: "Sunday", opens: "10:00", closes: "16:00" },
  ],

  /** Condensed form for footers and compact cards. */
  openingHoursSummary: [
    { label: "Monday – Saturday", value: "9:00am – 6:00pm" },
    { label: "Sunday", value: "10:00am – 4:00pm" },
  ],

  outOfHours: "Viewings outside these hours can be arranged on request — just call ahead.",

  parking: "Free parking on site.",

  transport: {
    rail: {
      label: "Stratford Station",
      detail: "Central line, Jubilee line, DLR, Elizabeth line and National Rail",
    },
    bus: {
      label: "Bus routes",
      detail: "25, 86, 238 and 276 all stop on Romford Road",
    },
    road: {
      label: "By road",
      detail: `Direct access from the A11 and A12. Sat nav ${"E15 2BX"} routes to the parking entrance.`,
    },
  },

  /**
   * Regulatory position, quoted from the dealership's own terms. They are an
   * introducer, not a lender — this wording must not be softened.
   */
  compliance: {
    creditBroker:
      "Stratford City Motorcars is a credit broker, not a lender. We introduce customers to FCA-regulated finance partners.",
    financeSubjectToStatus:
      "All finance is subject to status, eligibility and lender approval. Terms and conditions apply.",
    partExchangeSubjectToInspection:
      "All valuations are an initial guide and are confirmed only after a physical inspection and document check.",
    /**
     * Their published site carries no FCA firm reference, company number or VAT
     * number. These render only once real values are supplied — never invented.
     */
    fcaFirmReferenceNumber: null as string | null,
    companyNumber: null as string | null,
    vatNumber: null as string | null,
  },

  /** Deposit band taken verbatim from their terms. */
  reservationDeposit: "£99 – £500",
} as const;

export type OpeningHours = (typeof site.openingHours)[number];

/** Google Maps deep links, built from the address rather than hardcoded URLs. */
export const mapLinks = {
  directions: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(site.address.full)}`,
  place: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.address.full)}`,
  embed: `https://www.google.com/maps?q=${encodeURIComponent(site.address.full)}&output=embed`,
};
