import type { Metadata } from "next";

import { formatMileage } from "./format";
import { site } from "./site";
import type { VehicleView } from "./inventory/types";

const DEFAULT_OG = "/brand/og-default.jpg";

interface PageMetaInput {
  title: string;
  description: string;
  /** Route path beginning with a slash — drives the canonical URL. */
  path: string;
  image?: string;
  noIndex?: boolean;
  type?: "website" | "article";
}

/**
 * Every page builds its metadata through here so canonicals, Open Graph and
 * Twitter cards can never drift apart. Titles are composed by the template in
 * the root layout, so `title` is the page-specific part only.
 */
export function pageMetadata({
  title,
  description,
  path,
  image = DEFAULT_OG,
  noIndex = false,
  type = "website",
}: PageMetaInput): Metadata {
  const url = `${site.url}${path === "/" ? "" : path}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | ${site.name}`,
      description,
      url,
      siteName: site.name,
      locale: "en_GB",
      type,
      images: [{ url: image, width: 1200, height: 630, alt: site.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${site.name}`,
      description,
      images: [image],
    },
    robots: noIndex ? { index: false, follow: true } : undefined,
  };
}

// ---- Structured data ------------------------------------------------------

const postalAddress = {
  "@type": "PostalAddress",
  streetAddress: site.address.street,
  addressLocality: site.address.locality,
  addressRegion: site.address.region,
  postalCode: site.address.postcode,
  addressCountry: site.address.country,
};

/**
 * The dealership itself. Emitted once, from the root layout, with an @id that
 * the vehicle offers point back to so search engines connect seller to stock.
 */
export function autoDealerSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    "@id": `${site.url}/#dealer`,
    name: site.name,
    description: site.tagline,
    url: site.url,
    telephone: site.phone.e164,
    email: site.email,
    image: `${site.url}${DEFAULT_OG}`,
    logo: `${site.url}/brand/logo.webp`,
    address: postalAddress,
    geo: {
      "@type": "GeoCoordinates",
      latitude: site.geo.latitude,
      longitude: site.geo.longitude,
    },
    openingHoursSpecification: site.openingHours.map((entry) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: `https://schema.org/${entry.day}`,
      opens: entry.opens,
      closes: entry.closes,
    })),
    areaServed: [
      { "@type": "City", name: "London" },
      { "@type": "AdministrativeArea", name: "Greater London" },
    ],
    paymentAccepted: "Cash, Bank transfer, Debit card, Credit card, Finance",
    currenciesAccepted: "GBP",
    priceRange: "££££",
    hasMap: `${site.url.replace(/\/$/, "")}/contact`,
  };
}

/** A single listing, as a `Car` with an `Offer`. */
export function vehicleSchema(vehicle: VehicleView) {
  const availability =
    vehicle.status === "sold"
      ? "https://schema.org/SoldOut"
      : vehicle.status === "reserved"
        ? "https://schema.org/LimitedAvailability"
        : "https://schema.org/InStock";

  // Only assert properties we actually hold for this vehicle.
  const optional: Record<string, unknown> = {};
  if (vehicle.engine) optional.vehicleEngine = { "@type": "EngineSpecification", name: vehicle.engine };
  if (vehicle.doors) optional.numberOfDoors = vehicle.doors;
  if (vehicle.seats) optional.seatingCapacity = vehicle.seats;
  if (vehicle.registration) optional.vehicleIdentificationNumber = vehicle.registration;

  return {
    "@context": "https://schema.org",
    "@type": "Car",
    "@id": `${site.url}/vehicles/${vehicle.slug}#vehicle`,
    name: `${vehicle.year} ${vehicle.title}`,
    description: vehicle.description,
    url: `${site.url}/vehicles/${vehicle.slug}`,
    brand: { "@type": "Brand", name: vehicle.make },
    model: vehicle.model,
    vehicleModelDate: String(vehicle.year),
    productionDate: String(vehicle.year),
    bodyType: vehicle.bodyType,
    color: vehicle.colour,
    fuelType: vehicle.fuel,
    vehicleTransmission: vehicle.transmission,
    vehicleConfiguration: vehicle.bodyType,
    mileageFromOdometer: {
      "@type": "QuantitativeValue",
      value: vehicle.mileage,
      unitCode: "SMI",
    },
    itemCondition: "https://schema.org/UsedCondition",
    ...optional,
    ...(vehicle.displayImages.length
      ? { image: vehicle.displayImages.map((img) => `${site.url}${img.src}`) }
      : {}),
    offers: {
      "@type": "Offer",
      "@id": `${site.url}/vehicles/${vehicle.slug}#offer`,
      price: vehicle.price,
      priceCurrency: "GBP",
      availability,
      itemCondition: "https://schema.org/UsedCondition",
      url: `${site.url}/vehicles/${vehicle.slug}`,
      seller: { "@id": `${site.url}/#dealer` },
    },
  };
}

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbSchema(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${site.url}${crumb.path === "/" ? "" : crumb.path}`,
    })),
  };
}

export function faqSchema(entries: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    })),
  };
}

/** The stock page, as an ordered list of the vehicles currently shown. */
export function itemListSchema(vehicles: VehicleView[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: vehicles.map((vehicle, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${site.url}/vehicles/${vehicle.slug}`,
      name: `${vehicle.year} ${vehicle.title}`,
    })),
  };
}

/** Short, factual summary used in vehicle page descriptions. */
export function vehicleMetaDescription(vehicle: VehicleView): string {
  const parts = [
    `${vehicle.year} ${vehicle.title} for sale in Stratford, East London.`,
    `${formatMileage(vehicle.mileage)}, ${vehicle.fuel}, ${vehicle.transmission}.`,
    vehicle.hpiClear ? "HPI clear." : "",
    "Finance and part exchange available.",
  ];
  return parts.filter(Boolean).join(" ");
}
