import { formatMileage, formatPrice } from "./format";
import { site } from "./site";
import type { Vehicle } from "./inventory/types";

/**
 * WhatsApp is the dealership's strongest conversion channel, so every link is
 * built with the context already written into the message. A buyer taps once
 * and the dealer immediately knows which car is being asked about.
 */
function build(message: string): string {
  return `https://wa.me/${site.whatsapp.number}?text=${encodeURIComponent(message)}`;
}

export const whatsappLinks = {
  /** Footer, header and contact page. */
  general: build(
    `Hi ${site.name}, I'd like to ask about a car you have in stock.`,
  ),

  /** Homepage hero and closing CTA. */
  browsing: build(
    `Hi ${site.name}, I'm looking for a car and would like some help choosing.`,
  ),

  /** From the stock page when nothing matches the filters. */
  sourcing: build(
    `Hi ${site.name}, I couldn't find what I'm after on your website. Could you let me know what else you have available?`,
  ),

  finance: build(
    `Hi ${site.name}, I'd like to talk about finance options.`,
  ),

  partExchange: build(
    `Hi ${site.name}, I'd like a part-exchange valuation for my car.`,
  ),

  hire: build(`Hi ${site.name}, I'd like to enquire about hiring a vehicle.`),

  bookViewing: build(
    `Hi ${site.name}, I'd like to book a viewing at your Stratford showroom.`,
  ),
};

/**
 * Vehicle-specific message. Includes year, make, model, price and mileage so
 * the dealer can answer without asking which listing the buyer means.
 */
export function whatsappForVehicle(vehicle: Vehicle): string {
  return build(
    [
      `Hi ${site.name}, I'm interested in the ${vehicle.year} ${vehicle.title}`,
      `(${formatPrice(vehicle.price)}, ${formatMileage(vehicle.mileage)}).`,
      `Is it still available?`,
    ].join(" "),
  );
}

/** "I have a car to part exchange" from a specific listing. */
export function whatsappPartExchangeForVehicle(vehicle: Vehicle): string {
  return build(
    `Hi ${site.name}, I'm interested in the ${vehicle.year} ${vehicle.title} and I have a car to part exchange. Could you give me a valuation?`,
  );
}

/** "Tell me about finance" from a specific listing. */
export function whatsappFinanceForVehicle(vehicle: Vehicle): string {
  return build(
    `Hi ${site.name}, I'd like to know about finance options on the ${vehicle.year} ${vehicle.title} (${formatPrice(vehicle.price)}).`,
  );
}
