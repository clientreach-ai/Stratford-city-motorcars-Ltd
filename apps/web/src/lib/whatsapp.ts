import { formatMileage, formatVehiclePrice } from "./format";
import type { Site } from "./site";
import type { PublicVehicle } from "./inventory/types";

type VehicleSummary = Pick<PublicVehicle, "year" | "title" | "price" | "priceOnApplication" | "mileage">;

/**
 * The business details a link needs. Always the saved ones — `getSite()` on the
 * server, `useSite()` in the browser — so a number changed in the admin reaches
 * every link, not only the ones built after the next deploy.
 */
type Business = Pick<Site, "name" | "whatsapp">;

/**
 * WhatsApp is the dealership's strongest conversion channel, so every link is
 * built with the context already written into the message. A buyer taps once
 * and the dealer immediately knows which car is being asked about.
 */
function build(site: Business, message: string): string {
  return `https://wa.me/${site.whatsapp.number}?text=${encodeURIComponent(message)}`;
}

/** A plain chat, for fallbacks where there is no context worth writing in. */
export function whatsappChat(site: Business): string {
  return `https://wa.me/${site.whatsapp.number}`;
}

export function whatsappLinksFor(site: Business) {
  return {
    /** Footer, header and contact page. */
    general: build(
      site,
      `Hi ${site.name}, I'd like to ask about a car you have in stock.`,
    ),

    /** Homepage hero and closing CTA. */
    browsing: build(
      site,
      `Hi ${site.name}, I'm looking for a car and would like some help choosing.`,
    ),

    /** From the stock page when nothing matches the filters. */
    sourcing: build(
      site,
      `Hi ${site.name}, I couldn't find what I'm after on your website. Could you let me know what else you have available?`,
    ),

    finance: build(
      site,
      `Hi ${site.name}, I'd like to talk about finance options.`,
    ),

    partExchange: build(
      site,
      `Hi ${site.name}, I'd like a part-exchange valuation for my car.`,
    ),

    bookViewing: build(
      site,
      `Hi ${site.name}, I'd like to book a viewing at your Stratford showroom.`,
    ),
  };
}

/**
 * Vehicle-specific message. Includes year, make, model, price and mileage so
 * the dealer can answer without asking which listing the buyer means.
 */
export function whatsappForVehicle(site: Business, vehicle: VehicleSummary): string {
  return build(
    site,
    [
      `Hi ${site.name}, I'm interested in the ${vehicle.year} ${vehicle.title}`,
      `(${formatVehiclePrice(vehicle)}, ${formatMileage(vehicle.mileage)}).`,
      `Is it still available?`,
    ].join(" "),
  );
}

/** "I have a car to part exchange" from a specific listing. */
export function whatsappPartExchangeForVehicle(site: Business, vehicle: VehicleSummary): string {
  return build(
    site,
    `Hi ${site.name}, I'm interested in the ${vehicle.year} ${vehicle.title} and I have a car to part exchange. Could you give me a valuation?`,
  );
}

/** "Tell me about finance" from a specific listing. */
export function whatsappFinanceForVehicle(site: Business, vehicle: VehicleSummary): string {
  return build(
    site,
    `Hi ${site.name}, I'd like to know about finance options on the ${vehicle.year} ${vehicle.title} (${formatVehiclePrice(vehicle)}).`,
  );
}
