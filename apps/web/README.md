# Stratford City Motorcars — website

Public-facing site for the dealership at 21–25 Romford Road, Stratford, London
E15 4LJ. Next.js 16 (App Router, Turbopack), React 19, Tailwind v4, TypeScript.

```bash
pnpm install
pnpm dev:web        # http://localhost:3001
pnpm --filter web build
pnpm check-types
pnpm --filter web check-content   # fails if copy the client rejected returns
pnpm --filter web check-inventory # fails if the publishing rules regress
```

## Routes

| Route | Rendering | Notes |
| --- | --- | --- |
| `/` | Static | Hero search, featured stock, finance, part exchange, showroom, closing CTA. The featured grid shows only cars marked `featured` and is omitted when there are none; stock summary and search are omitted when no vehicle is public |
| `/vehicles` | Dynamic | Reads `searchParams`; defaults to price high to low; filtered views are `noindex` and canonicalise to `/vehicles`. Filters and sort are omitted when no vehicle is public |
| `/vehicles/[slug]` | SSG | Prerendered only for vehicles that pass the publishing rules (see below); any other slug returns 404 |
| `/finance` | Static | HP / PCP / personal loan explained, enquiry form |
| `/part-exchange` | Static | Valuation form, what happens next |
| `/about`, `/contact` | Static | |
| `/privacy`, `/terms`, `/cookies` | Static | Interim `noindex` placeholders — see "Needed from the client" |
| `/sitemap.xml`, `/robots.txt` | Static | Public pages plus public vehicles; legal placeholders excluded; staff routes disallowed |
| `/login`, `/dashboard` | — | Better-Auth scaffolding in the `(admin)` route group, `noindex`. Untouched; this is where the admin dashboard goes. |

There is no `/hire` route. The client confirmed vehicle hire is not part of this
business (City Chauffeurs handles it), so the URL falls through to the 404 page.

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

**Visibility lives here too.** `loadVehicles()` drops every vehicle that fails
the publishing rules in `src/lib/inventory/visibility.ts`, and every listing,
featured grid, related list, facet, make/model index, static param, sitemap entry
and single-vehicle lookup reads through it. A replacement source must keep that
filter, and every consumer must cope with it returning an empty array.

A vehicle is public only when **all** of these hold:

- `published: true` — the client has confirmed it is for sale and its details
  and price are correct
- its price is within the client's normal stock range, **£20,000–£1,000,000**
  inclusive (`PUBLIC_PRICE_RANGE`). This is what keeps the old £16,000 Jaguar XF
  and £12,000 ML63 AMG records hidden even if someone publishes them.
- it has at least one dealer **exterior** and one dealer **interior** photograph
  (`REQUIRED_DEALER_PHOTOS`; each image carries a `view`). Library stand-ins do
  not count. The client wants cars hidden until properly photographed.

A vehicle marked published but withheld by a rule is logged once per process
(`[inventory] v001 (jaguar-xf-2012) is published but withheld: price-out-of-range`),
so the flag never fails silently. `published` is separate from `status`
(available / reserved / sold): a sold car stays public and keeps its page.

**Featured is hand-picked.** `getFeaturedVehicles()` returns only unsold cars
marked `featured` and never pads the homepage with other stock. With none
featured, the homepage shows no grid.

There is no backend yet, so `src/lib/inventory/data.ts` is the stock source.
To list a car the client has confirmed, correct its record there, add its dealer
exterior and interior photographs (see [PHOTOGRAPHY.md](./PHOTOGRAPHY.md)) and
set `published: true`.

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
    visibility.ts          Publishing rules (price range, dealer photography)
                           and featured selection
    repository.ts          ← integration point (applies the visibility rules)
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
- **Positioning follows the client's own words:** a small family-owned business
  trading in sports and luxury cars, with enquiries handled personally. The site
  does not describe it as an independent dealer, a dealer group, a Rolls-Royce
  or classic specialist, or commission-free.
- **No preparation or turnaround guarantees.** The client prepares cars with a
  service and MOT, but did not confirm "every car has a full service and MOT
  before sale" as a public claim, nor a 24-hour or same-day response, nor
  "competitive valuations". Part-exchange figures are an initial guide,
  confirmed on inspection.

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
| **Photography before launch** | Cars without dealer exterior and interior photographs are now hidden by code, and no car has photographs yet, so the site launches with no listings until a first photographed batch is added. Confirm that is acceptable, and whether one exterior plus one interior is the right minimum. See [PHOTOGRAPHY.md](./PHOTOGRAPHY.md). |
| **Stock price range** | The public range is enforced as £20,000–£1,000,000 from the intake's "roughly" figures. Confirm the bounds, and what should happen to a genuine car outside them. |
| **Service/MOT and response-time wording** | Whether the client wants to commit publicly to a preparation standard or a response time. The site currently promises neither. |
| **Open Graph image** | `public/brand/og-default.jpg` still reads "Prestige, performance & classic motorcars". It needs regenerating with the confirmed positioning. |
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

From the repo root:

```bash
pnpm install --frozen-lockfile
pnpm check-types
pnpm --filter web build
pnpm --filter web check-content                          # source
node apps/web/scripts/check-content.mjs .next/server/app # source + built HTML
pnpm --filter web check-inventory
```

`check-content` scans the source (and, optionally, the built HTML) for copy the
client intake rejected, and exits non-zero on a hit: vehicle hire, the
fabricated testimonials, the old hours and sat-nav postcode, finance/broker
claims, "included"/AA warranty, blanket HPI claims, the old legal boilerplate,
links to the old £12k/£16k vehicle pages, the "every car has a full service and
MOT" guarantee, 24-hour/same-day promises, "competitive valuations" and
unconfirmed business identities. Run against the P0 source it reports 24 hits.

`check-inventory` exercises `visibility.ts` against `data.ts` and fixtures: the
old £12k/£16k records stay hidden even when published and photographed; a car
without dealer exterior and interior photographs stays hidden (library images do
not count); the price bounds are inclusive; the homepage features only
hand-picked cars; and `repository.ts` routes through those rules. It uses Node's
built-in TypeScript type stripping (Node 22.18+ / 23.6+), with no dependencies.

### Results — P0.5 (September 2026)

Run on Linux, Node 26.8.1, pnpm 11.3.0, from a checkout whose path contains a
space.

- **Install:** `pnpm install --frozen-lockfile` up to date; lockfile consistent.
- **TypeScript:** `pnpm check-types` passes (server, ui, web).
- **Build:** `next build` (Next 16.3.4) clean; 16 static pages. With every
  record unpublished, `/vehicles/[slug]` prerenders no pages and no
  `[inventory]` warnings are logged.
- **Content check:** passes on `src/` and on the built HTML.
- **Inventory check:** 15 of 15 pass. Temporarily reverting the price floor,
  the interior-photo requirement or the featured fallback each made it fail.
- **Routes (`next start`):** `/`, `/vehicles` (default, sorted and filtered),
  `/finance`, `/part-exchange`, `/about`, `/contact`, `/privacy`, `/terms`,
  `/cookies`, `/sitemap.xml` and `/robots.txt` return 200. `/hire`,
  `/executive-hire`, all seven vehicle slugs and an unknown slug return 404.
  The sitemap lists the six public pages only. The legal placeholders and
  filtered `/vehicles` views carry `noindex, follow`.
- **Rendered copy:** no hire, testimonials, E15 2BX, old hours, broker/lender
  claims, included warranty, blanket HPI, £12k/£16k pages, reservation deposit,
  service/MOT guarantee, 24-hour or same-day promise, "competitive valuations",
  commission/independent/specialist wording or prestige/classic positioning.
  E15 4LJ appears on every page.
- **Publishing gate, end to end:** a temporary, uncommitted edit to `data.ts`
  published six records and rebuilt. Only the two that passed every rule (SL63
  AMG and Silver Shadow, with dealer exterior and interior photos) were
  prerendered, listed and added to the sitemap. The £16k XF and £12k ML63
  (photographed), the Macan S (exterior photo only) and the Dawn (library image
  only) returned 404, and each was logged with its blocker. The XF, Macan S and
  Dawn were also marked `featured`; none reached the homepage. `/vehicles` listed
  the SL63 then the Silver Shadow by default (price high to low), and reversed
  with `?sort=price-asc`. The homepage featured only the SL63, not the published
  but unfeatured Silver Shadow. With the SL63 unfeatured as well, the homepage
  rendered no vehicle grid while `/vehicles` still listed both cars. The edit
  was reverted and the committed state rebuilt before the results above.

Not re-run for P0 or P0.5, and so not reported: the original build's
accessibility (axe), interaction, keyboard and performance audits. Those results
predate the content and inventory changes. `/login` and `/dashboard` were not
exercised; `/dashboard` needs the API server at `NEXT_PUBLIC_SERVER_URL`.

## Scope

Sales only. An earlier build carried an Executive Hire page taken from the old
site; the client confirmed hire is not part of this business (City Chauffeurs
handles hiring), so the page, its navigation, FAQs, form option, sitemap entry
and structured data were removed. No referral to City Chauffeurs has been added
— the intake does not ask for one.
