# Stratford City Motorcars — build status

Branch `feat/phase-1-9-build`, September 2026. Not merged, pushed or deployed.

Related: [architecture](./STRATFORD_ARCHITECTURE.md) ·
[migration audit](./STRATFORD_MIGRATION_AUDIT.md) ·
[web app README](../apps/web/README.md)

Everything under **Completed** was exercised against a production build
(`next build` + `next start`), not only type-checked. Results are in
[Verification record](#verification-record).

---

## Completed

### Content and positioning (Phase 1)

- Client intake and legacy-site forensic audit, with every legacy page, claim,
  URL, image and vehicle classified KEEP / REWRITE / REPLACE / DELETE / CLIENT
  CONFIRMATION REQUIRED (`docs/STRATFORD_MIGRATION_AUDIT.md`).
- Copy follows the intake: a small family-owned business trading in sports and
  luxury cars, with the client's own line kept verbatim on About.
- Part-exchange turnaround is shown only as "usually within 24 hours on
  weekdays"; no same-day, preparation, HPI, warranty, finance-approval,
  broker/lender, prestige/classic-specialist or hire claims; no testimonials.
- Company name, number 15481206 and registered office (21–25 Romford Road,
  E15 4LJ) in the footer, checked against Companies House.

### One inventory for site and dashboard (Phase 2)

- `vehicle` table (Postgres) as the single source of truth, with a read-only
  seed fallback when no database is configured.
- Editable `VehicleRecord` and strict `PublicVehicle`; the public site can only
  receive the latter.
- Publishing rules enforced in one place: status, £20k–£1M or POA, dealer
  exterior + interior photos, required details. Draft / published / sold /
  archived lifecycle, reserved, hand-picked featured, POA sorting, make/model
  filters, price high-to-low default.
- The seven legacy records imported as unconfirmed drafts; old slugs preserved.

### Public site (Phase 3)

- Home, stock list, vehicle page, finance, part exchange, about, contact,
  privacy/terms/cookies placeholders, 404 and error pages.
- Vehicle page: gallery with keyboard lightbox, price panel (POA, sold,
  reserved, admin fee), WhatsApp/call/book-a-viewing, specification, history
  and checks (HPI, warranty, service, MOT history, V5C, ULEZ — shown only when
  recorded), walkaround video, features, enquiry form with request types,
  prefilled part-exchange and finance links, related cars, mobile action bar.
- Representative finance example and "reserve this car" are built but switched
  off until the client and providers are confirmed (`site.ts`).

### Media (Phase 4)

- Upload pipeline: EXIF rotation, metadata and GPS stripped, max 2560px, WebP,
  minimum 800px and size limits with plain-English refusals.
- Photo categories, alt text, cover choice, reorder, removal (deletes the file),
  video upload or YouTube/Vimeo link, 360° link.
- `next/image` with AVIF/WebP and per-layout `sizes`; eager, high-priority first
  gallery image; immutable caching for uploaded media.
- Retired brand assets replaced (Open Graph card, favicon and app icons with the
  new positioning).

### SEO and legacy redirects (Phase 5)

- Per-page metadata and canonicals, AutoDealer/WebSite/Car/Breadcrumb JSON-LD
  (no `Offer` for POA), sitemap with vehicle images, robots rules.
- Permanent redirects for `/sales`, `/used-cars-stratford`, `/mission`,
  `/admin*` and `/sales/<legacy-slug>`. Renamed cars redirect from their old
  `/vehicles/<slug>`.
- Filtered stock views are `noindex` with a canonical to `/vehicles`; real 404s.

### Enquiries (Phase 6)

- Four forms (vehicle enquiry with request type, finance, part exchange,
  contact), server-side Zod validation, field errors with focus management.
- Enquiries stored in the `lead` table and/or sent to a webhook; success is
  shown only when one of those worked. Honest failure otherwise.
- Honeypot, link-count rejection, per-IP throttle; no personal data in logs.

### Responsiveness and accessibility (Phase 7)

- No horizontal overflow at 1440, 1280, 1024, 834, 768, 430, 390 and 375px.
- Touch targets of at least 44px for controls; focus-trapped dialogs (lightbox,
  filters, mobile nav, confirmations) that return focus; skip link.
- Content visible without JavaScript; reveal animation only below the fold and
  inert under reduced motion.

### Performance and hardening (Phase 8)

- Security headers (nosniff, referrer policy, frame denial, limited CSP,
  permissions policy, HSTS), no `X-Powered-By`, `no-store` + `noindex` on
  staff routes, error boundaries that do not leak details.

### Dashboard (Phase 9)

- Staff login (sign-up disabled; owner accounts by script), session check in
  every page, action and upload.
- Overview, inventory list, vehicle editor with live publishing blockers and
  field-level validation, media manager, enquiries with status.
- Publish/unpublish, mark sold, reserve, feature, archive/restore, duplicate;
  stale-save protection; slug conflicts explained.

---

## Client confirmation required

Nothing here is published until the client confirms it. Items 1–17 match the
register in the migration audit.

1. Which cars go online first, with prices or POA. None of the seven legacy
   records is confirmed.
2. Correct prices for the Rolls-Royce Dawn and Corniche, or POA.
3. Order and wording of the three promises (trust and transparency, quality
   standards, personal service).
4. Public wording for vehicle preparation (service and MOT), if any.
5. Whether to promise a response time.
6. FCA status wording (credit broker, lender or introducer) and FRN display.
7. Lender panel, representative APR and representative example.
8. Whether a finance calculator and soft-search check are wanted, and with
   which provider.
9. Reservation deposit amount (£100–£500), refund terms and payment provider.
10. Admin, documentation and delivery fees: amounts and when they apply.
11. Warranty provider, availability and term ranges per car.
12. Approved privacy policy, terms and conditions (including distance sales),
    complaints procedure and cookie policy.
13. Whether "Ltd" should appear in customer-facing copy beyond the footer.
14. Trading-history wording (trading since 2019 vs incorporated 2024).
15. Instagram and TikTok handles, if they should be linked.
16. Contact form enquiry types.
17. Canonical domain (`www.stratfordcitymotorcars.com`) and who holds the
    registrar/DNS login.
18. That one dealer exterior plus one dealer interior photograph is the right
    minimum to publish (the 20+ target is advisory).
19. The £20,000–£1,000,000 public price range, and how to treat a genuine car
    outside it.
20. Per-car HPI status, service history, MOT history and V5C details — entered
    only from the client's records.

## External setup required

None of these are configured, and no credentials or providers have been
assumed.

| Item | Needed for | Notes |
| --- | --- | --- |
| Production Postgres | Inventory, enquiries, staff accounts | Run `pnpm --filter @Stratford-city-motorcars-Ltd/db db:migrate` (the root `pnpm db:migrate` goes through turbo, which needs an interactive terminal), then optionally `pnpm --filter web inventory:import-seed`, then `pnpm --filter web create-owner` |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` | Dashboard | Secret of 32+ random characters; URL is the site origin |
| Persistent media storage | Uploaded photos and video | Local disk today (`MEDIA_ROOT`). Needs a host with a persistent volume, or an object-storage implementation of `MediaStorage` |
| Hosting | Everything | A long-running Node server (`next start`) is assumed. Serverless hosting needs object storage and a shared rate limiter first |
| Email and SMS notifications | Telling the business about enquiries | Webhook (`LEADS_WEBHOOK_URL`) to Zapier/Make/n8n works today; or a provider-specific `LeadNotifier` |
| Domain and DNS | Launch | Set `NEXT_PUBLIC_SITE_URL`; redirect the apex and any `.co.uk` to the canonical host |
| Finance provider and FCA wording | Monthly figures, soft search | Then set `site.finance.statusStatement` |
| Payment provider | Online reservations | Hosted checkout URL in `RESERVATION_CHECKOUT_URL`, then enable in `site.ts` |
| Registration lookup (e.g. DVLA/MOT history API) | Faster data entry | Not built; fields are entered manually |
| Analytics with consent | Measurement | Not built; would need a cookie banner and policy |
| Google Business Profile | Local search, reviews | Client-side task |
| CAPTCHA or shared rate limiting | Spam at scale | Current throttle is in memory per process |

## Launch blockers

The site should not go live until these are resolved:

1. **No confirmed stock.** Every record is a draft and no car has dealer
   photography, so the public site would show no cars.
2. **Legal pages are placeholders.** The forms collect names, emails and phone
   numbers; an approved privacy notice must exist before they go live.
3. **Production database, auth secret and owner account** are not provisioned.
4. **Persistent media storage** is not provisioned; uploads on an ephemeral
   filesystem would be lost.
5. **No enquiry notification.** Without a webhook or provider, enquiries are
   only visible in the dashboard and nobody is alerted.
6. **Canonical domain and DNS** are not configured.
7. **Finance page wording** should be reviewed against the firm's confirmed FCA
   status before launch (no figures or approval claims are shown today).

---

## Known risks and limitations

- **Rate limiting is in memory.** It resets on restart and is not shared across
  instances.
- **Media** is on local disk; video is stored as uploaded (no transcoding or
  poster generation), and uploads are buffered in memory (25 MB photo / 200 MB
  video limits).
- **CSP** does not restrict scripts or styles (Next.js inline scripts would need
  nonces).
- **Dependency audit:** `pnpm audit --prod` reports one moderate advisory
  (esbuild dev server, GHSA-67mh-4wv8-2f99) reached through `drizzle-kit`, a
  development tool not shipped to the browser or run in production serving.
- **Commit `b581ff3` does not build on its own** (the old dashboard still
  imports the removed auth client); `6e243a6` completes it. Squash or keep the
  pair together if the history is rewritten.
- **Home page LCP** is the H1 text; Lighthouse attributes most of it to web-font
  render delay (see results below).
- **Page redirects for renamed cars** carry the same `Location` header twice
  (Next.js behaviour); browsers follow it, verified in Chromium.
- `apps/server` (Hono) is legacy scaffolding and is not needed to run the site.

---

## Verification record

Run on Linux (Node 26.8.1, pnpm 11.3.0, Chromium via puppeteer-core, axe-core,
Lighthouse), against local Postgres 18 (PGlite) with test fixtures that exist
only in the local test database. Test credentials were local-only.

### Repository checks (on `b9d575d`)

| Check | Result |
| --- | --- |
| `pnpm check-types` | Pass |
| `pnpm --filter web check-content` | Pass |
| `pnpm --filter web check-inventory` | 26/26 pass |
| Mutation: price floor lowered to £10,000 | check-inventory fails (as intended) |
| Mutation: photo minimum disabled | check-inventory fails (as intended) |
| `next build` with and without `DATABASE_URL` | Pass |

### Setup path on an empty database (`b9d575d`)

| Step | Result |
| --- | --- |
| `drizzle-kit migrate` (db package) | Creates `account`, `lead`, `session`, `user`, `vehicle`, `verification` |
| `inventory:import-seed`, run twice | 7 drafts imported, none featured; second run skips all 7 |
| `create-owner` with a 5-character password / valid / same email again | Refused / created / refused |
| Better Auth sign-in: correct password / wrong password | 200 with session cookie / 401 |
| Better Auth sign-up | Refused (400); no user created |

### Browser and HTTP checks (production build, database mode)

Suites were run on `6e243a6`; `b9d575d` changed only the vehicle page's
not-found path and was re-verified with the redirect checks below.

| Suite | Result |
| --- | --- |
| Horizontal overflow, 8 widths × public pages | None |
| axe-core, public pages at 1280 and 390 | No violations |
| axe-core, dashboard pages at 1280 and 390 | No violations |
| Keyboard (lightbox, filter sheet, mobile nav, skip link) | 11/11 |
| Forms (validation, focus, success, viewing rules, honeypot, links, throttle, prefill) | 13/13 |
| Webhook delivery | Received with bearer token; honeypot field not forwarded |
| Server log PII scan after form tests | 0 matches for test names, emails and phones |
| Dashboard end to end (login, create, validate, publish gate, upload, publish, public page, feature, sold, archive, enquiries, mobile) | 23/23 |
| Media (video link rules, YouTube, reorder, remove + file deleted, duplicate) | 6/6 |
| Upload API (`b9d575d`): no session / valid session from another origin | 401 / 403 |
| Uploaded 4000×3000 JPEG with GPS and camera EXIF (`b9d575d`) | Stored as 2560×1920 WebP; no EXIF, GPS or camera strings in the file |
| Captured server action replayed without session (`b9d575d`) | Redirected to `/login`; database unchanged |
| Same action replayed with a session from another origin (`b9d575d`) | Rejected; database unchanged |
| Rename a public car in the dashboard (`b9d575d`) | Old `/vehicles/` and `/sales/` URLs 308 to the new page; sitemap shows only the new URL |
| Unknown, draft and malformed vehicle slugs (`b9d575d`) | 404 |
| Security headers on `/`; `/dashboard` without session | Present; 307 to `/login` with `no-store` and `noindex` |
| No-JavaScript render of home | All content visible |
| Console errors on public pages | None (except the expected 404 resource on `/hire`) |
| Image sizing (home, stock, vehicle; 390@3x and 1440@2x) | CLS 0; vehicle photos ≤1.31× rendered size; logo 1.77× (5 KB) |

Lighthouse (mobile emulation, local production server, `6e243a6`):

| Page | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Home | 92 | 100 | 100 | 100 | 3.4 s | 0 | 42 ms |
| Stock | 90 | 100 | 100 | 100 | 3.5 s | 0.023 | 53 ms |
| Vehicle | 93 | 100 | 100 | 100 | 3.2 s | 0 | 59 ms |
| Contact | 93 | 100 | 100 | 100 | 3.2 s | 0 | 68 ms |

Local results with simulated mobile throttling; production numbers depend on
hosting, CDN and real photographs.

### Seed mode (no database, `6e243a6`)

- All public routes 200; legacy redirects correct; `/hire` and every
  unconfirmed legacy car 404.
- Empty-stock states render (no grids, filters or search); sitemap lists the six
  public pages.
- `/dashboard` redirects to `/login`, which explains the missing configuration;
  `/api/auth/*` returns 503.
- Content check passes on the built HTML.

### Not verified

- Real devices (tested in Chromium emulation only), Safari and Firefox.
- Deployment to any hosting provider, real DNS, HTTPS cookies in production.
- Real email/SMS delivery (only a local webhook receiver).
- Load, concurrency beyond single-user editing, and very large uploads.
- Screen readers beyond axe-core automated checks.
