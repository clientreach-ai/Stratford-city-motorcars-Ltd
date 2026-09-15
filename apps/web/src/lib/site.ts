/**
 * Single source of truth for the dealership's business facts.
 *
 * The client intake (September 2026) is authoritative. Values from the previous
 * website are kept only where the intake does not contradict them, and nothing
 * is invented. Where a fact is not confirmed it is marked `null` and the UI
 * omits it rather than guessing.
 *
 * The geo coordinates are the one deliberate correction: the previous site
 * published 51.5365 / 0.0040, which sits roughly 650m from the showroom. The
 * values below were resolved from the E15 4LJ postcode via postcodes.io and
 * cross-checked against OpenStreetMap.
 */

const RAW_PHONE = "+447722116355";

// ---- Opening hours ----------------------------------------------------------
//
// Confirmed by the client: Monday to Friday 12pm–5pm; weekends and bank
// holidays by appointment only; out-of-hours viewings arranged by WhatsApp or
// text. These three constants are the only place hours are defined — every
// string below and the structured data in `seo.ts` derive from them, so the
// header, footer, contact page and schema cannot disagree again.

const OPEN_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
const OPENS = "12:00";
const CLOSES = "17:00";

/** "12:00" → "12pm", "17:30" → "5:30pm". */
function clock(time: string): string {
  const hours = Number(time.slice(0, 2));
  const minutes = time.slice(3, 5);
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}${minutes === "00" ? "" : `:${minutes}`}${hours >= 12 ? "pm" : "am"}`;
}

const firstDay = OPEN_DAYS[0];
const lastDay = OPEN_DAYS[OPEN_DAYS.length - 1];
const openTimes = `${clock(OPENS)}–${clock(CLOSES)}`;

export const site = {
  /** Brand name as it is set in the logo ("MOTORCARS", one word). */
  name: "Stratford City Motorcars",
  /** Used where a longer, more formal reading suits the sentence. */
  longName: "Stratford City Motorcars",
  /**
   * The client's own positioning: "Small family owned business trading in
   * sports and luxury cars." Not a specialist in any one marque, not a dealer
   * group, and no commission or preparation promises the intake does not make.
   */
  tagline: "Sports and luxury cars from a small family-owned business in Stratford, East London",

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

  hours: {
    /**
     * The regular opening hours — the only hours published as structured data.
     * Appointment-only times have no Schema.org equivalent and are not encoded.
     */
    open: { days: OPEN_DAYS, opens: OPENS, closes: CLOSES },

    /** Rows for the footer and the showroom panel. */
    summary: [
      { label: `${firstDay} – ${lastDay}`, value: openTimes },
      { label: "Saturday & Sunday", value: "By appointment" },
      { label: "Bank holidays", value: "By appointment" },
    ],

    /** One line for tight spaces: header strip, mobile drawer, contact card. */
    compact: `${firstDay.slice(0, 3)}–${lastDay.slice(0, 3)} ${openTimes} · Weekends & bank holidays by appointment`,

    /** Weekday hours only, for the header strip where `compact` would wrap. */
    short: `${firstDay.slice(0, 3)}–${lastDay.slice(0, 3)} ${openTimes}`,

    /** Full sentence for metadata and running copy. */
    sentence: `We're open ${firstDay} to ${lastDay}, ${openTimes}, and by appointment at weekends and on bank holidays.`,

    outOfHours: "To arrange a viewing outside these hours, message us on WhatsApp or send a text.",
  },

  parking: "Free parking on site.",

  /**
   * Written directions — the client asked for them alongside the map. The
   * sat-nav note records the client's own experience: E15 4LJ is the correct
   * postcode, but some sat navs stop short of or past the showroom.
   */
  directions: {
    satNav:
      "Use E15 4LJ. Some sat navs finish a little before or after the showroom, so look for numbers 21–25 Romford Road.",
    onFoot: "From Stratford station, walk to The Broadway and continue east onto Romford Road.",
    byCar: "Romford Road is the A118, reached from the A11 and A12. There's free parking on site.",
  },

  transport: {
    rail: {
      label: "Stratford Station",
      detail: "Central line, Jubilee line, DLR, Elizabeth line and National Rail",
    },
    bus: {
      label: "Bus routes",
      detail: "25, 86, 238 and 276 all stop on Romford Road",
    },
  },

  /**
   * Confirmed by the client: warranties are not included in the price and are
   * sold separately through a third-party provider. The provider is not named,
   * and whether cover is offered on every car is unconfirmed — so the site says
   * neither.
   */
  warranty: {
    label: "Sold separately",
    statement:
      "Warranty is not included in the vehicle price. Third-party warranty cover is sold separately.",
  },

  /**
   * Legal entity. Company name, number, place of registration and registered
   * office must appear on a UK company's website. The number comes from the
   * client intake; the registered office was checked on the Companies House
   * register (15 September 2026) and is the showroom address the client
   * confirmed.
   */
  company: {
    legalName: "Stratford City Motorcars Ltd",
    number: "15481206",
    registeredIn: "England and Wales",
    registeredOffice: "21-25 Romford Road, London, E15 4LJ",
  },

  /**
   * Finance promotion switch.
   *
   * The site explains HP, PCP and personal loans (client-confirmed wording) but
   * makes no finance offer. A monthly figure or a finance calculator is a
   * financial promotion: it needs the firm's approved FCA status statement, a
   * lender and a full representative example. The client has no lender panel
   * yet and is still confirming whether it acts as a broker, lender or
   * introducer, so this stays off. Set `statusStatement` to the approved
   * wording (from the client's compliance adviser) to enable per-car monthly
   * figures — never write it here yourself.
   */
  finance: {
    statusStatement: null as string | null,
    /** FCA firm reference number from the intake. Shown only with the status statement. */
    firmReferenceNumber: "1042347",
  },

  /**
   * Online reservation switch. The client wants buyers to reserve a car with a
   * card deposit of £100–£500. That needs a payment provider, a confirmed
   * deposit amount and approved refund terms, none of which exist yet, so the
   * reserve panel is built but not rendered.
   */
  reservations: {
    enabled: false,
    depositGbp: null as number | null,
  },

  compliance: {
    partExchangeSubjectToInspection:
      "All valuations are an initial guide and are confirmed only after a physical inspection and document check.",
    /** Only if the business is VAT registered — not supplied. */
    vatNumber: null as string | null,
  },
} as const;

/** Google Maps deep links, built from the address rather than hardcoded URLs. */
export const mapLinks = {
  directions: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(site.address.full)}`,
  place: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.address.full)}`,
  embed: `https://www.google.com/maps?q=${encodeURIComponent(site.address.full)}&output=embed`,
};
