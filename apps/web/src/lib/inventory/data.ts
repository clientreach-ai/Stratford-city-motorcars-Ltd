import type { VehicleRecord } from "./types";

/**
 * Seed inventory: the seven cars from the previous site's inventory API
 * (`/api/vehicles`), transcribed on 10 September 2026 and re-checked against a
 * crawl on 15 September 2026.
 *
 * This is the stock source only while no database is configured. With
 * `DATABASE_URL` set, the database is the single source of truth for the
 * public site and the dashboard, and these records are imported once with
 * `pnpm --filter web inventory:import-seed` (as drafts).
 *
 * EVERY RECORD IS A DRAFT. The client holds around 30 cars and has not
 * confirmed that any of these seven are still for sale or correctly priced;
 * two prices are confirmed wrong (Dawn, Corniche). None has dealer photography,
 * so none can be published until photographed, and the Jaguar XF (£16,000) and
 * ML63 AMG (£12,000) are below the £20,000–£1,000,000 range.
 *
 * Rules followed when transcribing:
 *  - Price, mileage, year, fuel, transmission, colour, body type, description
 *    and feature lists are copied from the source, except that "HPI clear"
 *    wording was removed: the client confirmed most, not all, cars are checked.
 *  - Not migrated: the source's `hpiClear: true` on every car (→ `unknown`),
 *    its per-car `warrantyMonths` (warranty is third-party and sold
 *    separately; availability left unset), and its `available` / `sold` flags.
 *  - `engine`, `interior` and `serviceHistory` are set only where the
 *    dealership's own feature list or description states them.
 *  - Nothing the intake asks every listing to show (registration date,
 *    previous owners, insurance group, MOT expiry, road tax band, V5) is held
 *    for these cars, so none of it is filled in.
 *  - `previousSlugs` holds the legacy `/sales/…` slug so old links redirect.
 */
export const seedVehicles: VehicleRecord[] = [
  {
    id: "v006",
    slug: "rolls-royce-dawn-2016",
    previousSlugs: ["rolls-royce-dawn"],
    // The client confirmed £30,000 is an error. Do not publish until the
    // correct price is supplied.
    status: "draft",
    reserved: false,
    featured: false,
    title: "Rolls-Royce Dawn",
    make: "Rolls-Royce",
    model: "Dawn",
    year: 2016,
    price: 30000,
    priceOnApplication: false,
    mileage: 28000,
    fuel: "Petrol",
    transmission: "Automatic",
    bodyType: "Convertible",
    colour: "Arctic White",
    engine: "6.6L Twin-Turbo V12",
    interior: "Cream leather with navy hood",
    motHistory: [],
    hpiStatus: "unknown",
    warranty: { available: null },
    ulezCompliant: null,
    description:
      "The Rolls-Royce Dawn is the most social of super-luxury cars — an open-top four-seater that makes an entrance everywhere it goes. This stunning example in arctic white with a navy hood and cream leather interior is simply spectacular. The whisper-quiet fabric roof opens in 22 seconds, transforming this masterpiece into the ultimate open-air experience.",
    features: [
      "6.6L Twin-Turbo V12",
      "Bespoke Audio System",
      "Starlight Headliner",
      "Suicide Rear Doors",
      "Heated & Massaging Seats",
      "Night Vision",
      "Wi-Fi Hotspot",
      "Spirit of Ecstasy",
    ],
    media: [
      /**
       * Reference only. A commercially licensed (CC0), colour-accurate photograph
       * of the same model — not this car. Library media never satisfies the
       * publishing gate and is never rendered on the public site.
       */
      {
        id: "rolls-royce-dawn-2016-library-front",
        kind: "image",
        src: "/vehicles/rolls-royce-dawn-2016/exterior-front.webp",
        alt: "Rolls-Royce Dawn convertible in white with a navy hood, front three-quarter view",
        width: 1023,
        height: 639,
        category: "exterior",
        provenance: "library",
        credit: {
          author: "crash71100",
          license: "CC0 1.0",
          licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
          sourceUrl: "https://www.flickr.com/photos/152930510@N02/45293854451",
        },
      },
    ],
    createdAt: "2026-09-10T00:00:00.000Z",
    updatedAt: "2026-09-10T00:00:00.000Z",
  },
  {
    id: "v004",
    slug: "rolls-royce-corniche-1999",
    previousSlugs: ["rolls-royce-corniche"],
    // The client confirmed £60,000 is an error. Do not publish until the
    // correct price (or a decision on POA) is supplied.
    status: "draft",
    reserved: false,
    featured: false,
    title: "Rolls-Royce Corniche",
    make: "Rolls-Royce",
    model: "Corniche",
    year: 1999,
    price: 60000,
    priceOnApplication: false,
    mileage: 42000,
    fuel: "Petrol",
    transmission: "Automatic",
    bodyType: "Convertible",
    colour: "Silver Seraph",
    interior: "Connolly leather with burr walnut dashboard",
    serviceHistory: "Comprehensive history file",
    motHistory: [],
    hpiStatus: "unknown",
    warranty: { available: null },
    ulezCompliant: null,
    description:
      "One of the most desirable and elegant convertibles ever produced, the Rolls-Royce Corniche is a true classic motorcar. Hand-built with unrivalled attention to detail, this example features the sumptuous Connolly leather interior and burr walnut dashboard that define Rolls-Royce craftsmanship at its finest.",
    features: [
      "Classic Rolls-Royce Pedigree",
      "Connolly Leather Interior",
      "Burr Walnut Dashboard",
      "Power Hood",
      "Comprehensive History File",
      "Matching Numbers",
    ],
    media: [],
    createdAt: "2026-09-10T00:00:00.000Z",
    updatedAt: "2026-09-10T00:00:00.000Z",
  },
  {
    id: "v003",
    slug: "mercedes-benz-sl63-amg-2016",
    previousSlugs: ["mercedes-sl63-amg-2016"],
    status: "draft",
    reserved: false,
    featured: false,
    title: "Mercedes-Benz SL63 AMG",
    make: "Mercedes-Benz",
    model: "SL63 AMG",
    year: 2016,
    price: 40000,
    priceOnApplication: false,
    mileage: 38000,
    fuel: "Petrol",
    transmission: "Automatic",
    bodyType: "Convertible",
    colour: "Obsidian Black",
    engine: "5.5L Biturbo V8",
    interior: "Red leather",
    motHistory: [],
    hpiStatus: "unknown",
    warranty: { available: null },
    ulezCompliant: null,
    description:
      "The SL63 AMG is the definitive grand tourer — breathtaking to look at and even more thrilling to drive. This 2016 example features the twin-turbo V8, AMG Performance exhaust and retractable hardtop. Finished in obsidian black with a red leather interior, it commands attention wherever it goes.",
    features: [
      "5.5L Biturbo V8",
      "AMG Performance Exhaust",
      "Retractable Hardtop",
      "Red Leather Interior",
      "Bang & Olufsen Audio",
      "Magic Sky Control",
      "Heated & Ventilated Seats",
      "AMG Driver's Package",
    ],
    media: [],
    createdAt: "2026-09-10T00:00:00.000Z",
    updatedAt: "2026-09-10T00:00:00.000Z",
  },
  {
    id: "v007",
    slug: "porsche-macan-s-2014",
    previousSlugs: ["porsche-macan-2014"],
    status: "draft",
    reserved: false,
    featured: false,
    title: "Porsche Macan S",
    make: "Porsche",
    model: "Macan S",
    year: 2014,
    price: 25000,
    priceOnApplication: false,
    mileage: 62000,
    fuel: "Petrol",
    transmission: "Automatic",
    bodyType: "SUV",
    colour: "Jet Black Metallic",
    engine: "3.0L Twin-Turbo V6",
    serviceHistory: "Full Porsche service history",
    motHistory: [],
    hpiStatus: "unknown",
    warranty: { available: null },
    ulezCompliant: null,
    description:
      "The Porsche Macan S is the benchmark for the premium compact SUV segment — combining Porsche sports car DNA with everyday practicality. This 2014 example in jet black metallic is in excellent condition with a full Porsche service history, making it a superb choice for the discerning driver.",
    features: [
      "3.0L Twin-Turbo V6",
      "Full Porsche Service History",
      "Sport Chrono Package",
      "PASM Suspension",
      "BOSE Sound System",
      "Panoramic Roof",
      "20\" Macan Turbo Wheels",
    ],
    media: [],
    createdAt: "2026-09-10T00:00:00.000Z",
    updatedAt: "2026-09-10T00:00:00.000Z",
  },
  {
    id: "v005",
    slug: "rolls-royce-silver-shadow-1978",
    previousSlugs: ["rolls-royce-silver-shadow"],
    status: "draft",
    reserved: false,
    featured: false,
    title: "Rolls-Royce Silver Shadow",
    make: "Rolls-Royce",
    model: "Silver Shadow",
    year: 1978,
    price: 20000,
    priceOnApplication: false,
    mileage: 58000,
    fuel: "Petrol",
    transmission: "Automatic",
    bodyType: "Saloon",
    colour: "Silver",
    interior: "Original",
    serviceHistory: "Comprehensive history",
    motHistory: [],
    hpiStatus: "unknown",
    warranty: { available: null },
    ulezCompliant: null,
    description:
      "An iconic piece of British motoring history — the Rolls-Royce Silver Shadow is one of the most recognisable and celebrated classic cars in the world. This beautifully preserved example is a collector's dream, offering the serenity and prestige that only a Rolls-Royce can provide.",
    features: [
      "Classic British Icon",
      "Original Interior",
      "Comprehensive History",
      "Matching Numbers",
      "Collector Quality",
    ],
    media: [],
    createdAt: "2026-09-10T00:00:00.000Z",
    updatedAt: "2026-09-10T00:00:00.000Z",
  },
  {
    id: "v001",
    slug: "jaguar-xf-2012",
    previousSlugs: [],
    // £16,000 is below the client's £20,000–£1,000,000 range, so the price
    // rule in visibility.ts blocks publishing at this price. Kept as history.
    status: "draft",
    reserved: false,
    featured: false,
    title: "Jaguar XF",
    make: "Jaguar",
    model: "XF",
    year: 2012,
    price: 16000,
    priceOnApplication: false,
    mileage: 68000,
    fuel: "Diesel",
    transmission: "Automatic",
    bodyType: "Saloon",
    colour: "Midnight Black",
    interior: "Leather",
    serviceHistory: "Full service history",
    motHistory: [],
    hpiStatus: "unknown",
    warranty: { available: null },
    ulezCompliant: null,
    description:
      "A stunning example of the iconic Jaguar XF in deep midnight black. This executive saloon presents beautifully inside and out with a refined interior, smooth automatic gearbox and the effortless performance Jaguar is renowned for. Full service history and ready to drive away.",
    features: [
      "Full Service History",
      "Leather Interior",
      "Heated Seats",
      "Sat Nav",
      "Parking Sensors",
      "Bluetooth",
      "Cruise Control",
    ],
    media: [],
    createdAt: "2026-09-10T00:00:00.000Z",
    updatedAt: "2026-09-10T00:00:00.000Z",
  },
  {
    id: "v002",
    slug: "mercedes-benz-ml63-amg-2006",
    previousSlugs: ["mercedes-ml63-amg-2006"],
    // £12,000 is below the client's £20,000–£1,000,000 range, so the price
    // rule in visibility.ts blocks publishing at this price. Kept as history.
    status: "draft",
    reserved: false,
    featured: false,
    title: "Mercedes-Benz ML63 AMG",
    make: "Mercedes-Benz",
    model: "ML63 AMG",
    year: 2006,
    price: 12000,
    priceOnApplication: false,
    mileage: 95000,
    fuel: "Petrol",
    transmission: "Automatic",
    bodyType: "SUV",
    colour: "Silver",
    engine: "6.3L V8",
    interior: "Full leather",
    motHistory: [],
    hpiStatus: "unknown",
    warranty: { available: null },
    ulezCompliant: null,
    description:
      "A rare and formidable ML63 AMG — Mercedes-Benz's most powerful ML of its era. The 6.3-litre naturally aspirated V8 delivers explosive performance in a commanding SUV body. This example presents well and offers extraordinary value for a true AMG icon.",
    features: [
      "6.3L V8 AMG Engine",
      "Full Leather",
      "AMG Sports Package",
      "Panoramic Roof",
      "Heated Seats",
      "Multi-Zone Climate Control",
      "Harman Kardon Sound",
    ],
    media: [],
    createdAt: "2026-09-10T00:00:00.000Z",
    updatedAt: "2026-09-10T00:00:00.000Z",
  },
];
