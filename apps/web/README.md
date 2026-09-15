# Stratford City Motorcars — web app

The public website and the staff dashboard for Stratford City Motorcars, 21–25
Romford Road, Stratford, London E15 4LJ. Next.js 16 (App Router, Turbopack),
React 19, Tailwind v4, Drizzle + Postgres, Better Auth.

- **How it works:** [docs/STRATFORD_ARCHITECTURE.md](../../docs/STRATFORD_ARCHITECTURE.md)
- **What is done, what is waiting, launch blockers:** [docs/STRATFORD_BUILD_STATUS.md](../../docs/STRATFORD_BUILD_STATUS.md)
- **Why the content says what it says:** [docs/STRATFORD_MIGRATION_AUDIT.md](../../docs/STRATFORD_MIGRATION_AUDIT.md)
- **Photographing stock:** [PHOTOGRAPHY.md](./PHOTOGRAPHY.md)

## Quick start

```bash
pnpm install
cp apps/web/.env.example apps/web/.env    # fill in what you need, see below
pnpm dev:web                              # http://localhost:3001
```

With no `DATABASE_URL`, the site runs from the read-only seed records in
`src/lib/inventory/data.ts`. They are all drafts, so the site shows no cars, and
the dashboard explains what is missing.

### With a database and the dashboard

```bash
# apps/web/.env: DATABASE_URL, BETTER_AUTH_SECRET (openssl rand -base64 32),
#                BETTER_AUTH_URL=http://localhost:3001
pnpm --filter @Stratford-city-motorcars-Ltd/db db:migrate
pnpm --filter web inventory:import-seed     # optional: the 7 legacy records, as drafts
pnpm --filter web create-owner --email you@example.com --name "Your Name"
pnpm dev:web                                # sign in at /login
```

`create-owner` reads the password from `OWNER_PASSWORD` or prompts for it
(at least 12 characters). There is no public sign-up.

Use the `--filter` form of `db:migrate` in scripts and deploys: the root
`pnpm db:migrate` runs through turbo, which treats it as interactive and refuses
to run without a terminal.

## Environment

All documented in [`.env.example`](./.env.example). Never commit real values.

| Variable | Needed for |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonicals, Open Graph, sitemap, robots (defaults to `https://www.stratfordcitymotorcars.com`) |
| `NEXT_PUBLIC_SERVER_URL` | Still validated at build time; set it to this app's origin |
| `DATABASE_URL` | Inventory from Postgres, stored enquiries, dashboard. Same value at build and runtime |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` | Dashboard sign-in |
| `LEADS_WEBHOOK_URL`, `LEADS_WEBHOOK_TOKEN` | Enquiry notifications to any JSON webhook (Zapier, Make, n8n, a CRM) |
| `MEDIA_ROOT` | Where uploaded photos and videos live (default `apps/web/.data/media`; must be persistent) |
| `MEDIA_PUBLIC_BASE_URL` | Reserved for object storage behind a CDN |
| `RESERVATION_CHECKOUT_URL` | Hosted deposit checkout; ignored unless reservations are enabled in `site.ts` |

## Routes

| Route | Rendering | Notes |
| --- | --- | --- |
| `/` | Static, 5 min revalidate | Featured cars appear only if hand-picked; stock search only when cars are listed |
| `/vehicles` | Dynamic | Make/model filters, sort (default price high to low). Any query string is `noindex` |
| `/vehicles/[slug]` | Prerendered + on demand | Public cars only; sold cars stay up marked SOLD; renamed cars redirect (308); anything else 404 |
| `/finance`, `/part-exchange`, `/about`, `/contact` | Static | `?vehicle=<slug>` prefills the finance and part-exchange forms |
| `/privacy`, `/terms`, `/cookies` | Static | `noindex` placeholders until the client supplies approved documents |
| `/sales/[slug]` | Route handler | Legacy URLs: 308 to the car's current page, or to `/vehicles` |
| `/sitemap.xml`, `/robots.txt` | Static | Public pages and unsold public cars; staff routes disallowed |
| `/login` | Dynamic | Staff sign-in |
| `/dashboard`, `/dashboard/inventory`, `/dashboard/inventory/[id]`, `/dashboard/enquiries` | Dynamic | Staff only |
| `/api/auth/*` | Route handler | Better Auth (503 when not configured) |
| `/api/dashboard/media` | Route handler | Staff uploads |
| `/media/*` | Route handler | Uploaded media, immutable caching, range requests |

Redirects in `next.config.ts`: `/sales` and `/used-cars-stratford` → `/vehicles`,
`/mission` → `/about`, `/admin` and `/admin/*` → `/login`. There is no `/hire`:
vehicle hire is not part of this business.

## Where things live

```text
src/app/(site)/          Public pages and chrome
src/app/(admin)/         /login and /dashboard (noindex, no public chrome)
src/app/api/             Auth and media upload
src/lib/site.ts          Business facts and feature switches (finance, reservations, VAT)
src/lib/seo.ts           Metadata and JSON-LD
src/lib/inventory/       Vehicle model, publishing rules, stores, repository
src/lib/media/           Photo processing and storage
src/lib/forms/           Form options, Zod schemas, server actions
src/lib/leads/           Enquiry storage, notifiers, throttle
src/lib/dashboard/       Dashboard data loading, editor values, server actions
src/lib/server/staff.ts  Session checks (requireStaff)
src/components/          site, home, vehicle, forms, dashboard, ui
scripts/                 check-content, check-inventory, import-seed, create-owner
```

## Rules that must not be weakened

These are enforced in code and covered by `check-inventory` and
`check-content`. Details are in the architecture doc.

- A car appears publicly only if it is published (or sold), priced £20,000–
  £1,000,000 or POA, has at least one dealer exterior **and** one dealer
  interior photograph, and has its core details. Library images never count.
- Featured cars are hand-picked only; the homepage never pads with other stock.
- Sold cars keep their page but leave listings, the homepage, related cars and
  the sitemap.
- Forms never show success unless the enquiry was stored or delivered, and never
  log personal data.
- No finance figures without the confirmed FCA status statement; no reservation
  link without a confirmed deposit and provider.
- No claims the client has not confirmed: vehicle hire, testimonials,
  blanket HPI or included warranty, finance approval or broker/lender status,
  preparation guarantees, same-day or unqualified 24-hour responses, prestige or
  classic-specialist positioning.

## Scripts

```bash
pnpm check-types                        # all packages
pnpm --filter web build
pnpm --filter web check-content         # rejected copy in src/
node apps/web/scripts/check-content.mjs .next/server/app   # …and in built HTML (paths are relative to apps/web)
pnpm --filter web check-inventory       # 26 publishing-rule checks
pnpm --filter web inventory:import-seed # Bun; needs DATABASE_URL
pnpm --filter web create-owner --email … --name "…"   # Bun; needs DATABASE_URL + auth env
```

## Deploying

The app assumes a long-running Node server (`next build` then `next start`)
with a persistent volume for `MEDIA_ROOT`. Before going live, work through the
launch blockers and external setup in
[STRATFORD_BUILD_STATUS.md](../../docs/STRATFORD_BUILD_STATUS.md). In short:
production Postgres with migrations applied, an owner account, persistent
media storage, an enquiry notification destination, approved legal pages, the
canonical domain, and confirmed stock with dealer photography.

Serverless hosting would first need an object-storage `MediaStorage` and a
shared rate limiter (the enquiry throttle is in memory).

## Design system

Tokens live in `packages/ui/src/styles/globals.css`, shared by the public site
and the dashboard: warm near-monochrome with one brass accent, 2px radius,
Cinzel (wordmark and eyebrows), Newsreader (headlines) and Archivo (UI and body)
self-hosted through `next/font`. Dark sections are opt-in per section with
`data-surface="dark"`. Motion uses one easing curve and is inert under
`prefers-reduced-motion`.
