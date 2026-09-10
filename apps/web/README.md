# Stratford City Motorcars — website

Public-facing site for the dealership at 21–25 Romford Road, Stratford, London
E15 4LJ. Next.js 16 (App Router, Turbopack), React 19, Tailwind v4, TypeScript.

```bash
pnpm install
pnpm dev:web        # http://localhost:3001
pnpm --filter web build
pnpm check-types
```

## Routes

| Route | Rendering | Notes |
| --- | --- | --- |
| `/` | Static | Hero search, featured stock, trust, finance, part exchange, testimonials, showroom, closing CTA |
| `/vehicles` | Dynamic | Reads `searchParams`; filtered views are `noindex` and canonicalise to `/vehicles` |
| `/vehicles/[slug]` | SSG | Prerendered from `generateStaticParams`, one page per vehicle |
| `/finance` | Static | HP / PCP / personal loan, four-step process, enquiry form |
| `/part-exchange` | Static | Valuation form, what happens next |
| `/hire` | Static | The existing hire line — see "Scope" below |
| `/about`, `/contact` | Static | |
| `/privacy`, `/terms`, `/cookies` | Static | Rendered from `lib/content/legal.ts` |
| `/sitemap.xml`, `/robots.txt` | Static | 17 URLs; staff routes disallowed |
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

### 2. Enquiries — `src/lib/forms/leads.ts`

**Nothing is wired up yet, and the forms say so.** With no destination
configured, a valid submission returns `status: "unavailable"`, the form shows
"We couldn't send that" with the phone and WhatsApp buttons, and the server logs
a loud warning. A lead that silently vanishes is worse for the dealership than
one that never submitted.

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
  site.ts                  Business facts — NAP, hours, transport, compliance
  seo.ts                   Metadata helper + JSON-LD builders
  whatsapp.ts              Contextual wa.me deep links
  inventory/
    types.ts               Vehicle model; every spec field optional
    data.ts                The seven real vehicles
    repository.ts          ← integration point
    query-params.ts        URL ⇄ query
  content/
    services.ts            Finance products, part-exchange steps, trust, hire
    testimonials.ts        Six real testimonials
    faqs.ts                Ten real FAQs
    legal.ts               Privacy, terms, cookies
  forms/
    options.ts             Option lists + FormState (no Zod)
    schemas.ts             Zod schemas, server only
    actions.ts             Server actions
    leads.ts               ← integration point
```

### Content rules that were followed

Everything factual came from the previous site or its API on 10 September 2026.
Nothing was invented. Specifically:

- Spec fields render **only** where a value exists. Registration, power, doors
  and seats are absent from the source, so no vehicle shows those rows.
- `engine`, `interior` and `serviceHistory` are set only where the dealership's
  own feature list or description states them.
- **ULEZ status is never asserted.** It depends on a vehicle's Euro rating, not
  its age, and that is not held. The vehicle page says it will be confirmed in
  writing.
- No APRs, monthly figures, approval odds, review counts, awards or
  certifications appear anywhere. "Finance available" is as far as it goes,
  because no rates are known.
- The credit-broker disclosure is quoted from their own terms and appears on
  every page that mentions finance.

### Two corrections to the old site

- **Geo coordinates.** The old markup published `51.5365, 0.0040`, roughly 650m
  from the showroom. `site.ts` uses `51.542405, 0.005234`, resolved from the
  E15 4LJ postcode via postcodes.io and cross-checked against OpenStreetMap.
- **Placeholder contact details.** Their schema.org block carried
  `"telephone": "+44 0000 000000"` and an incomplete `"postalCode": "E15"`.

## Needed from the client before launch

| Item | Why |
| --- | --- |
| **Vehicle photography** | See [PHOTOGRAPHY.md](./PHOTOGRAPHY.md). The biggest single improvement available. |
| **Lead destination** | Forms are honest about being unwired, but they are not capturing enquiries. |
| **Company registration number and registered office** | UK companies must show these on their website. `site.compliance` has null slots ready. |
| **FCA firm reference number** | Required to describe yourself as a credit broker. Renders once supplied. |
| **VAT number** | If VAT registered. |
| **Confirm the canonical domain** | The site trades on `.com`; the old markup referenced a `.co.uk` that does not resolve. Set `NEXT_PUBLIC_SITE_URL`. |
| **Review the legal pages** | Transcribed from their published policies, last dated September 2024. |
| **Google Business Profile** | The six testimonials are self-hosted. Independently verifiable reviews carry far more weight — and feed the local pack. |

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
pnpm --filter web build
```

At the last full pass, on the production build:

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

Sales-led, with one Executive Hire page retained because the dealership already
runs that line and it had search presence — built only from facts already
published on their site (indicative £39–£79/day, insurance and breakdown cover
included, age and licence requirements, £0.15 per excess mile). Hire has no
booking form on purpose: availability changes daily and the page says to call.
