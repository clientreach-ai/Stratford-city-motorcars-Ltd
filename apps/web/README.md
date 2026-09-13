# Stratford City Motorcars — website

Public-facing site for the dealership at 21–25 Romford Road, Stratford, London
E15 4LJ. Next.js 16 (App Router, Turbopack), React 19, Tailwind v4, TypeScript.

```bash
pnpm install
pnpm dev:web        # http://localhost:3001
pnpm --filter web build
pnpm check-types
pnpm --filter web check-content   # fails if copy the client rejected returns
```

## Routes

| Route | Rendering | Notes |
| --- | --- | --- |
| `/` | Static | Hero search, featured stock, finance, part exchange, showroom, closing CTA. Stock summary, search and featured grid are omitted when no vehicle is published |
| `/vehicles` | Dynamic | Reads `searchParams`; defaults to price high to low; filtered views are `noindex` and canonicalise to `/vehicles`. Filters and sort are omitted when no vehicle is published |
| `/vehicles/[slug]` | SSG | Prerendered for **published** vehicles only; any other slug returns 404 |
| `/finance` | Static | HP / PCP / personal loan explained, enquiry form |
| `/part-exchange` | Static | Valuation form, what happens next |
| `/about`, `/contact` | Static | |
| `/privacy`, `/terms`, `/cookies` | Static | Interim `noindex` placeholders — see "Needed from the client" |
| `/sitemap.xml`, `/robots.txt` | Static | Public pages plus published, unsold vehicles; legal placeholders excluded; staff routes disallowed |

There is no `/hire` route. The client confirmed vehicle hire is not part of this
business (City Chauffeurs handles it), so the URL falls through to the 404 page.
| `/login`, `/dashboard` | — | Better-Auth scaffolding in the `(admin)` route group, `noindex`. Untouched; this is where the admin dashboard goes. |

Route groups: `(site)` carries the public chrome, `(admin)` deliberately carries
none.

## The two integration points

Everything else is plumbing. These are the two places real systems attach.

### 1. Inventory — `src/lib/inventory/repository.ts`

Every function is async and returns plain objects, so swapping the source means
editing `loadVehicles()` and nothing else. Filtering, sorting, faceting and all
seven components keep working untouched.

```ts
// Postgres, via the workspace db package
import { db } from "@Stratford-city-motorcars-Ltd/db";
async function loadVehicles(): Promise<Vehicle[]> {
  return db.query.vehicles.findMany();
}

// or the Hono API in apps/server
async function loadVehicles(): Promise<Vehicle[]> {
  const res = await fetch(`${process.env.INVENTORY_API_URL}/vehicles`, {
    next: { revalidate: 300, tags: ["vehicles"] },
  });
  if (!res.ok) throw new Error(`Inventory API ${res.status}`);
  return res.json();
}
```

Filtering runs in memory because the stock list is small. Past a few hundred
vehicles, push `searchVehicles` into SQL and keep the signature.

**Visibility lives here too.** `loadVehicles()` drops every vehicle whose
`published` flag is false, and every listing, featured grid, related list, facet,
make/model index, static param, sitemap entry and single-vehicle lookup reads
through it. A replacement source must keep that filter, and every consumer must
cope with it returning an empty array. `published` is separate from `status`
(available / reserved / sold): a sold car stays published and keeps its page.

There is no backend yet, so `src/lib/inventory/data.ts` is the stock source.
To list a car the client has confirmed, correct its record there and set
`published: true`.

### 2. Enquiries — `src/lib/forms/leads.ts`

**Nothing is wired up yet, and the forms say so.** With no destination
configured, a valid submission returns `status: "unavailable"`, the form shows
"We couldn't send that" with the phone and WhatsApp buttons, and the server logs
a loud warning containing only the form kind and a reference — never the
customer's name, email, phone or message. A lead that silently vanishes is
worse for the dealership than one that never submitted.

To switch it on:

```bash
# apps/web/.env
LEADS_WEBHOOK_URL=https://api.example.com/leads
LEADS_WEBHOOK_TOKEN=optional-bearer-token
```

Any endpoint accepting a JSON `POST` works — the Hono server, a CRM webhook,
Zapier, or a Resend/Postmark function. To write straight to Postgres instead,
replace the `fetch` with the db client. Whatever you choose is what the admin
dashboard should read from.

Validation is Zod, server-side only. Option lists and the shared `FormState`
live in `lib/forms/options.ts` specifically so client components never import
the schemas and pull Zod into the browser bundle.

## Data and content

```
src/lib/
  site.ts                  Business facts — NAP, the single hours model,
                           transport, warranty statement, compliance slots
  seo.ts                   Metadata helper + JSON-LD builders
  whatsapp.ts              Contextual wa.me deep links
  inventory/
    types.ts               Vehicle model; every spec field optional; DEFAULT_SORT
    data.ts                The old site's seven records, all unpublished
    repository.ts          ← integration point (and the visibility filter)
    query-params.ts        URL ⇄ query
    price-bands.ts         Homepage "Up to £X" bands, derived from published prices
  content/
    services.ts            Finance products, part-exchange steps
    faqs.ts                Warranty, part-exchange, visiting and delivery FAQs
    legal.ts               Interim legal placeholders (no policy wording)
  forms/
    options.ts             Option lists + FormState (no Zod)
    schemas.ts             Zod schemas, server only
    actions.ts             Server actions
    leads.ts               ← integration point
```

### Content rules that were followed

The client intake (September 2026) is authoritative. Content from the previous
site or its API (10 September 2026) is used only where the intake does not
contradict it. Nothing is invented. Specifically:

- **Hours are defined once**, in `site.ts` (Monday–Friday 12pm–5pm; weekends and
  bank holidays by appointment; out-of-hours viewings by WhatsApp or text).
  Every visible string and the structured data derive from it. Structured data
  publishes only the weekday hours.
- Spec fields render **only** where a value exists. Power, doors and seats are
  absent from the source, so no vehicle shows those rows. A registration is
  shown on the page but never published as a VIN.
- `engine`, `interior` and `serviceHistory` are set only where the dealership's
  own feature list or description states them.
- **History checks are per vehicle.** `hpiStatus` is `"clear"`, `"not-checked"`
  or unset (unknown → "Ask us"). The client confirmed most cars, not all, are
  checked, so there is no site-wide HPI claim.
- **Warranty is never shown as included.** It is sold separately through a
  third-party provider; one statement in `site.warranty` covers every page.
- **ULEZ status is never asserted.** It depends on a vehicle's Euro rating, not
  its age, and that is not held. The vehicle page says it will be confirmed in
  writing.
- **No finance availability or regulatory claims.** The HP, PCP and personal
  loan descriptions are the client-confirmed ones. There is no broker/lender
  statement, lender panel, approval-speed claim, APR or monthly figure: the
  client has no lender panel yet and its regulatory wording is unconfirmed.
- No reviews, testimonials, review counts, awards or certifications appear
  anywhere. The old site's named reviews were confirmed as made up.

### Two corrections to the old site

- **Geo coordinates.** The old markup published `51.5365, 0.0040`, roughly 650m
  from the showroom. `site.ts` uses `51.542405, 0.005234`, resolved from the
  E15 4LJ postcode via postcodes.io and cross-checked against OpenStreetMap.
- **Placeholder contact details.** Their schema.org block carried
  `"telephone": "+44 0000 000000"` and an incomplete `"postalCode": "E15"`.

## Needed from the client before launch

None of these have been decided. Do not fill them in from the old site.

| Item | Why |
| --- | --- |
| **Which cars are for sale, at what price** | Every record in `data.ts` is unpublished. The client holds ~30 cars; the seven old-site records are unconfirmed, and the Dawn and Corniche prices are confirmed wrong. |
| **Cars without photographs** | The client asked for un-photographed cars to be hidden, and no car has photographs yet. Decide whether to launch with no listings, allow placeholders temporarily, or wait for a first photographed batch. See [PHOTOGRAPHY.md](./PHOTOGRAPHY.md). |
| **History-check status per car** | Set `hpiStatus` only from the client's confirmation. |
| **Finance availability and regulatory wording** | Whether finance can be arranged today, and the approved FCA status wording. |
| **FCA firm reference number** | The intake gives it, but `site.compliance` keeps it null and nothing renders it: it needs approved wording and a component to display it. |
| **Company registration number and registered office** | UK companies must show these on their website. The intake gives the number; the registered office address is unconfirmed. `site.compliance` keeps null slots. |
| **VAT number** | If VAT registered. |
| **Legal documents** | `/privacy`, `/terms` and `/cookies` are noindex placeholders. The client has no written terms, privacy policy or complaints procedure; approved documents are needed. |
| **Whether forms stay live** | Forms collect personal data before a privacy notice and a lead destination exist. |
| **Lead destination** | Forms are honest about being unwired, but they are not capturing enquiries. |
| **Warranty detail** | Whether third-party cover is offered on every car, and any term range. |
| **POA for rare classics** | Requested in the intake; `price` is currently a required number. |
| **Confirm the canonical domain** | The site trades on `.com`; the old markup referenced a `.co.uk` that does not resolve. Set `NEXT_PUBLIC_SITE_URL`. |
| **Google Business Profile** | The client has no reviews yet. Independently verifiable reviews carry far more weight than self-hosted quotes — and feed the local pack. |

## Design system

Tokens live in `packages/ui/src/styles/globals.css`, shared with the future
admin dashboard.

- **Palette.** Warm near-monochrome. Ink (`#0a0a0b`) for cinematic anchors,
  bone/paper for browsing surfaces, one brass accent (`#b08d57` on dark,
  `#7a5f35` on light — both contrast-checked) used only for hairlines, eyebrows
  and active state. No gradients, no glassmorphism.
- **Dark sections are opt-in** per section via `data-surface="dark"`, which
  re-points the semantic tokens. A single page moves between registers without
  a global theme, and every component works in both unchanged.
- **Radius is 2px** everywhere. Sharp, not rounded.
- **Type.** Cinzel for the wordmark and eyebrows (it echoes the Roman capitals
  in the dealership's own logo), Newsreader for editorial headlines, Archivo for
  UI, body and tabular spec data. Three variable fonts, self-hosted by
  `next/font`, no external requests, no layout shift.
- **Motion.** One easing curve (`--ease-out-expo`), 200–400ms, and a single
  shared `IntersectionObserver` driving `.reveal`. Inert under
  `prefers-reduced-motion`.

Brand assets in `public/brand/` are derived from the dealership's own logo — the
wordmark in ink and bone, the coupé silhouette used as the hero watermark, and
a generated Open Graph card.

## Verification

Run the app, then from the repo:

```bash
pnpm check-types
pnpm --filter web check-content
pnpm --filter web build
node apps/web/scripts/check-content.mjs .next/server/app   # rendered HTML too
```

`check-content` scans the source (and, optionally, the built HTML) for copy the
client intake rejected — vehicle hire, the fabricated testimonials, the old
hours and sat-nav postcode, finance/broker claims, "included"/AA warranty,
blanket HPI claims and the old legal boilerplate — and exits non-zero on a hit.

The results below are from the original build pass, **before** the client-intake
content corrections. They have not been re-run since, and the route count and
prerendered vehicle pages have changed (no `/hire`; only published vehicles are
prerendered):

- **Build:** clean. 24 routes; all seven vehicle pages prerendered.
- **TypeScript:** no errors. `typedRoutes` is on, so every internal link is
  checked against real routes.
- **Accessibility:** 0 axe violations at WCAG 2.1 AA across 9 routes × desktop
  and mobile. Skip link, focus trapping in both drawers with focus restored on
  close, `inert` on closed overlays, visible focus rings, one `h1` per page.
- **Behaviour:** 32 interaction assertions and 11 keyboard assertions passing —
  hero search, dependent selects, filters, chips, sort, keyword search, empty
  state, gallery, lightbox, form validation, mobile nav, filter sheet, sticky
  bar.
- **Performance (mobile viewport, production build):** CLS 0, FCP/LCP ~130ms
  local, ~248kB gzip per page of which ~201kB is the React 19 + Next 16 runtime
  and the client components it needs.
- **Console:** no errors or warnings on any route.

## Scope

Sales only. An earlier build carried an Executive Hire page taken from the old
site; the client confirmed hire is not part of this business (City Chauffeurs
handles hiring), so the page, its navigation, FAQs, form option, sitemap entry
and structured data were removed. No referral to City Chauffeurs has been added
— the intake does not ask for one.
