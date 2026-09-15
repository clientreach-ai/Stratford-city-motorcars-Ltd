# Stratford City Motorcars — migration audit

Phase 1 reconciliation of the client intake, the legacy website and this
repository. It records what the old site said, what the client actually
confirmed, what the rebuild did about it, and what still needs the client.

## Sources and authority

| Rank | Source | Notes |
| --- | --- | --- |
| 1 | **Client intake** (form `STRATFORD_MOTORS_INTAKE`, completed by the director, September 2026) | Authoritative. Kept out of the repository (it contains personal contact details); quoted here only where a decision depends on the exact answer. |
| 2 | **Legacy site** `https://www.stratfordcitymotorcars.com/`, crawled 15 September 2026 | Reference only. Nothing is migrated because it exists there. |
| 3 | **This repository** at `origin/master` `1ffade6` (P0 + P0.5 merged) | Implementation source of truth at the start of the build. |
| — | Companies House public register, company 15481206, checked 15 September 2026 | Used to verify legal details the intake supplied. |

### How the legacy site was crawled

GET requests only, sequentially: `index.html`, the single JS bundle
(`index-BylYJH3Z.js`, 543 KB, no lazy chunks), the CSS, and the JSON API
(`/api/vehicles`, `/api/vehicles/:slug`, `/api/faqs`, `/api/testimonials`).
Routes, content strings, metadata and structured data were extracted from the
bundle, and every image URL found was fetched and measured. No forms were
submitted and no admin or `/api/leads` endpoints were called.

### Classification

**KEEP** — true and useful, migrate as is. **REWRITE** — the substance is
right, the wording is not. **REPLACE** — superseded by a confirmed fact.
**DELETE** — false, unsupported or out of scope. **CONFIRM** — client
confirmation required before anything is published.

---

## 1. Headline findings

1. **The legacy site cannot be indexed properly.** It is a client-rendered SPA:
   every URL — real routes, `/hire`, `/admin`, invented paths, `robots.txt`,
   `sitemap.xml`, `favicon.ico`, `og-image.jpg` — returns `200` with the same
   3.4 KB HTML shell. There are no real 404s, no sitemap, no robots file, and
   per-page titles exist only after JavaScript runs. This matches the client's
   biggest frustration: "No one can find it."
2. **Its canonical domain does not exist.** Every canonical, `og:url`,
   `og:image` and JSON-LD `url`/`logo` points at `stratfordcitymotorcars.co.uk`,
   which has no DNS record. The client had never heard of it. The bare
   `stratfordcitymotorcars.com` also serves the site without redirecting to
   `www`.
3. **Contact details contradict each other** — the client's first priority.
   The `index.html` JSON-LD says "Unit 12, Stratford Business Park, E15",
   "+44 0000 000000" and `sales@stratfordcitymotorcars.co.uk`; the contact page
   gives a sat-nav postcode of E15 2BX; everything else says 21–25 Romford Road,
   E15 4LJ. The intake confirms one address, one phone and one email.
4. **Hours are wrong everywhere.** "Mon–Sat 9am–6pm, Sun 10am–4pm" appears on
   every page. Confirmed hours are Monday–Friday 12–5pm, weekends and bank
   holidays by appointment.
5. **Vehicle hire is advertised but does not exist** — in the title, meta
   description, a `CarRental` JSON-LD block ("£39–£79 per day"), four FAQs and a
   whole Terms section — yet the SPA has no `/hire` route and the API has no
   hire vehicles. The client: "No — strip it from the site entirely."
6. **The reviews are fabricated.** Six named five-star "✓ Verified Buyer"
   testimonials. The client: "No — they were made up by the developer."
7. **Blanket HPI, AA-warranty, broker/lender and "same-day decision" claims**
   are all contradicted by the intake (most cars checked, not all; warranty is
   third-party and sold separately; no lender panel; broker/lender/introducer
   status unknown).
8. **Every vehicle page shows the same hard-coded sentence** ("…full service
   history. All vehicles come HPI clear with warranty options up to 12 months")
   instead of the car's own description, and **no car has a single image**.
9. **The header logo is a 6250×3125 px, 1.7 MB PNG** displayed about 70 px tall
   on every page.
10. **A "Reserve for £99" button leads nowhere** — it links to the contact page,
    which ignores the reservation parameter. Terms describe a £99–£500
    non-refundable deposit that no flow collects.

---

## 2. Migration matrix

"Current implementation" is the repository at `1ffade6`, before this build.

| Area | Old site | Client intake | Current implementation | Decision |
| --- | --- | --- | --- | --- |
| Business name | "Stratford City Motor Cars" (three words) | "Stratford city motorcars Ltd"; logo reads MOTORCARS | "Stratford City Motorcars" | **KEEP** repo. Legal name "Stratford City Motorcars Ltd" in company details. |
| Positioning | "Stratford's Premier Motor Group", "East London's Prestige Specialists", "Prestige & Classic Cars" | "Small family owned business trading in sports and luxury cars"; three Rolls-Royces are "coincidence", not a specialism | Family-owned, sports and luxury | **KEEP** repo. **DELETE** "premier motor group", "prestige specialists", classic specialism. |
| Showroom line | "We're a small, independent showroom and we like it that way. We won't put something on the forecourt we wouldn't be happy to drive ourselves." | "Yes — that's us, don't touch it" | Removed in P0.5 ("independent showroom" was treated as unconfirmed) | **KEEP verbatim** — restored on the About page. P0.5's blanket ban on "independent showroom" is narrowed accordingly (see §8). |
| About page | "family-feel showroom", "spent years getting to know…", "Local Expertise" | "Is the About page story still accurate? No — it needs rewriting"; don't name people | Rewritten in P0.5 | **REWRITE**, using the client's own answers (welcoming, comfortable showroom; take pride in stock; more of an experience than a car sale). No names. |
| "Take your time" message | "rather they left feeling good than rushed a decision" | "Yes — that's deliberate, keep it" | Present on About | **KEEP**. |
| Three promises | Trust & transparency, Quality standards, Personal service | "Right, but the order should change… more relatable and not cliché" — no order given | Removed | **CONFIRM** order and wording before reinstating. Not published. |
| Mission page | Community employment, hybrid/EV sourcing, multi-point inspection | Not asked; stock is petrol/diesel; no inspection claims confirmed | No `/mission` route | **DELETE** content. `/mission` → `/about` (308). |
| Tone | Mixed hype | "Assertive, confident, intelligent"; feel "Modern and minimal, Family-run, Quietly expensive"; never "overwhelmed or hard to navigate" | Restrained, editorial | **KEEP** repo direction. |
| Address | Romford Road, "Unit 12 Stratford Business Park", "E15" | "21-25 Romford road, London, E15 4LJ"; one site; Unit 12 unknown | 21–25 Romford Road, Stratford, London E15 4LJ | **KEEP** repo. **DELETE** Unit 12 and "E15". Verified against Companies House registered office. |
| Sat-nav postcode | "Sat Nav: E15 2BX" | Use E15 4LJ; "people… end up either before or after my showroom" | E15 4LJ | **REPLACE** E15 2BX. **ADD** a written sat-nav note (stops short or overshoots) on Contact. |
| Geo coordinates | 51.5365, 0.0040 (~650 m off) | — | 51.542405, 0.005234 (postcode centroid, OSM cross-check) | **KEEP** repo. |
| Phone | +44 7722 116355; JSON-LD "+44 0000 000000" | 07722116355 | +44 7722 116355 | **KEEP** repo. **DELETE** placeholder. |
| Email | stratfordcitymotorcars@gmail.com; JSON-LD `sales@…co.uk` | stratfordcitymotorcars@gmail.com | Same | **KEEP** repo. **DELETE** `.co.uk` address. |
| WhatsApp | wa.me/447722116355 with prefills | Enquiries come by phone and WhatsApp | Contextual wa.me links | **KEEP**. |
| Hours | Mon–Sat 9–6, Sun 10–4 (contact meta omits Sunday) | Mon–Fri 12–5pm; Sat–Sun appointment only; bank holidays by appointment; out-of-hours by WhatsApp or text | Single hours model in `site.ts` | **KEEP** repo. **DELETE** old hours. |
| Parking / transport | Free on-site parking; Stratford station; A11/A12; buses 25, 86, 238, 276; "5-minute walk"; "15 minutes by rail"; "25 minutes by car" | "Confirm the parking and directions detail — Yep" | Parking, rail, bus, A11/A12 kept; timing claims removed | **KEEP** parking, station, roads, buses. **DELETE** journey-time claims (the "5-minute walk" is not borne out by the coordinates, ~600 m straight line). |
| Map | "Interactive map would be displayed here" placeholder | "Yes, plus written directions" | Google Maps embed + travel cards | **KEEP** map; **ADD** written directions and sat-nav note. |
| Company details | None shown | Company number 15481206 | `site.compliance` slots null, nothing rendered | **REPLACE**: show legal name, registered in England and Wales, number 15481206, registered office — all verified on Companies House (active private limited company, incorporated 10 February 2024). |
| FCA | "credit broker, not a lender", "FCA-regulated finance partners"; no FRN | FRN 1042347; "FCA registered"; broker/lender/introducer "Not sure — need to check"; no lenders; APR "would depend" | FRN held null, not rendered | **CONFIRM** status wording. FRN not displayed without the correct status statement. **DELETE** broker/lender claims. |
| Trading history | "spent years" | Trading since 2019; company incorporated 2024 | Not shown | **CONFIRM** before stating a year (trading date predates incorporation). |
| Team | "experienced team" | 2 people; don't name them | No names | **KEEP** no names. **DELETE** "experienced team". |
| Stock volume | "always have more stock than we can list online" | 30 cars; ~20 on a full showroom; not listed because "takes too long to write up, no photographs" | "We hold more stock than we list online" | **KEEP** (true today). The dashboard is the answer to "takes too long". |
| Price range | Stock £12k–£60k | "From £20,000 to £1,000,000" | Enforced £20k–£1M publishing gate | **KEEP**. |
| Legacy vehicle records | 7 cars, no images, all "HPI clear", warranty months 0–12 | Dawn £30,000 and Corniche £60,000 "an error on the site"; none confirmed for sale | Seven records, all unpublished | **KEEP** as drafts only (see §5). **DELETE** `hpiClear` and `warrantyMonths` values. |
| Listing fields | Year, mileage, fuel, gearbox, colour, body | Year, Mileage, Gearbox, Colour, Body style, Engine size, Previous owners, Service history, Insurance group, MOT expiry, V5 / documentation, Warranty term, HPI status, Road tax band, Registration date, Fuel | Subset | **REPLACE** model with the full intake list (Phase 2). |
| Vehicle page | Hard-coded identical description; badges; "Reserve for £99" | Gallery, spec table, description, finance calculator with monthly figure, HPI status, warranty details, service history summary, MOT history, video walkaround, WhatsApp, "Book a viewing", part-exchange prompt, reserve online with deposit | Gallery, spec, description, history/warranty cards, enquiry form | **REWRITE** to the intake list (Phase 3). Monthly figure and reservation are built but switched off until compliance and payment prerequisites exist. |
| Sold cars | `sold` flag unused | "Mark it SOLD and keep the page up" | Sold sinks to bottom of listings | **REPLACE**: sold page stays up marked SOLD; leaves listings, filters, featured, related and the sitemap. |
| Filters | Search, make, price | "Model, Make" | Keyword, make, model, price, mileage, year, body, fuel, gearbox, features | **REPLACE** with make and model only — "never… hard to navigate". |
| Default sort | Unspecified | "Price high to low" | Price high to low | **KEEP**. |
| Featured | First three API vehicles | "Do you want to hand-pick featured cars? Yes" | Hand-picked only (P0.5) | **KEEP**. |
| POA | None | "Mostly, but some as POA" — rare classics | `price` required number | **REPLACE**: POA supported; POA cars exempt from the price range. |
| Admin/delivery fees | "Every price we quote includes all applicable charges" | Fees charged "Sometimes" | Not modelled | **DELETE** the all-inclusive claim. **ADD** optional per-car fee shown next to the price. |
| Payment methods | JSON-LD "Cash, Credit Card, Financing"; Terms "cash, bank transfer, debit/credit cards" | Bank transfer, debit card, credit card, cash, finance, part-exchange plus balance | Schema lists cash, transfer, cards, finance | **KEEP** + add part exchange in copy. |
| Delivery | "within the London area for an additional fee" (hire context) | "Yes — nationwide" | FAQ: nationwide, charges may apply | **KEEP** repo. **DELETE** London-only claim. |
| Photography | "Photography Coming Soon" placeholder; Unsplash stock backgrounds | 20+ photos incl. details; interiors always; walkaround video on each; 360 "if it's not expensive"; hide cars without photos | Gate: ≥1 dealer exterior + ≥1 dealer interior | **KEEP** gate. **ADD** detail/documents categories, video and 360 support, 20+ as the quality target. **DELETE** stock imagery. |
| HPI | "Every car… HPI clear", badges on all 7 | "Most of them"; via Autotrader portal; not downloadable | Per-car `hpiStatus`, unset = "Ask us" | **KEEP** per car: clear / not checked / unknown. |
| Preparation | "fully inspected", "multi-point", "immaculate condition with full service history" | Prep is "Full service mot"; not willing to show prep per car | No preparation claim (P0.5) | **CONFIRM** the public wording. Nothing published until then. |
| Warranty | "AA warranty options up to 12 months" | Sold separately; third party | Site statement: sold separately, third party | **KEEP** repo. **ADD** per-car availability and term (dashboard). **DELETE** AA and "up to 12 months". |
| Finance products | HP, PCP, personal loan descriptions | "Yes — all three, exactly as described" | Client-confirmed descriptions | **KEEP**. |
| Finance claims | "credit broker", "FCA-regulated partners", "same-day decision", "all credit profiles considered", "competitive rates", "Quick approvals" | No panel; status unknown; no APR | Removed (P0) | **DELETE** (P0 kept). |
| Monthly figure / calculator | None | Monthly figure "Yes — it's how people actually shop"; calculator "Advise us"; soft search "valuable" | None | **ADD** representative-example model and display, switched off until FCA wording and a lender exist. No calculator or soft search until a lender/provider is chosen (external). |
| Finance form | Budget, deposit, part exchange in one go | "Keep it but shorten it"; nobody has used it | Name, phone, email, vehicle, deposit, budget, employment, message, PX | **REWRITE** shorter. |
| Part exchange | 4 steps incl. "initial valuation within 24 hours" | "Yes — exactly that"; 24 h "Usually, on weekdays"; needs reg, make/model/year, mileage, service history, photos, outstanding finance, condition, number of keys, MOT status; reg lookup "would save a lot of typing" | 24 h removed (P0.5); fuel/transmission asked | **REWRITE**: restore four steps with the honest qualifier "usually within 24 hours on weekdays"; ask for keys and MOT status; drop fuel/transmission; photos by WhatsApp. Reg lookup is external (DVLA/provider). |
| Valuation claims | "fair, honest valuation", "Top prices paid", "no haggling" | Not asked | Removed | **DELETE**. |
| Response times | "within 5 minutes", "within 24 hours", "usually the same day" | Replies "Same day"; enquiries "get missed… more than I'd like" | "handled personally" | **KEEP** "handled personally". **CONFIRM** before promising a response time (same-day replies are typical but enquiries are admitted to be missed). |
| Viewings / test drives | "Out-of-hours viewings available on request" | Book viewing/test drive online "as a request we confirm"; out-of-hours by WhatsApp or text | Viewing via WhatsApp link | **ADD** viewing / test-drive request form (explicitly a request). |
| Reserve online | "Reserve for £99" (dead); Terms £99–£500 non-refundable | "Yes — take a card deposit", £100–£500 | Not shown (P0) | **DELETE** legacy button and terms. **ADD** reservation structure switched off until a payment provider, deposit amount and refund terms exist. |
| Enquiry notifications | Toasts only; `/api/leads` | Email and SMS; no tracking today; Autotrader CRM mentioned | Webhook or honest "not sent" | **ADD** stored enquiries (dashboard) + webhook; email/SMS providers **external**. |
| Contact form types | Four types | "Not sure" | Buying, finance, part exchange, something else | **KEEP** current four; **CONFIRM** later. |
| Testimonials | Six fabricated named reviews | Made up; could get "a few" real ones; 0 Google reviews; no GBP | None | **DELETE** permanently. Real reviews to come from a Google Business Profile (external). |
| Trade bodies | None claimed | None | None | **KEEP** none. |
| Consumer rights | Terms: returns "if significantly different" | "Whatever the consumers right act is"; sells unseen occasionally | Legal placeholders | **CONFIRM** with approved terms (distance sales carry extra obligations). |
| Legal pages | Privacy/Terms/Cookies dated "September 2024", hire terms, GA/Ads cookies not actually set, implied-consent banner | No written terms, privacy policy or complaints procedure | Interim noindex placeholders | **KEEP** placeholders. **CONFIRM** approved documents. |
| Cookie banner | Implied consent | — | None; site sets no analytics cookies | **KEEP** none while nothing non-essential is set. |
| Analytics | Claimed GA + Ads; not actually loaded | "Is there analytics? No" | None | **External**: add only with a consent mechanism. |
| Title / meta | Shell title "Prestige Used Cars & Executive Hire…"; per-route titles client-side only; vehicle meta repeats the year ("2012 2012 Jaguar XF") | Want to be found for "Car sales in east london"; buyers travel nationwide | Server-rendered per-page metadata | **REWRITE** titles/descriptions around sports and luxury car sales in East London (Phase 5). |
| Structured data | `AutoDealer` + `CarRental` with Unit 12, placeholder phone, `.co.uk` URLs | — | `AutoDealer` from `site.ts`; `Car`/`Offer` per vehicle | **DELETE** `CarRental`. **KEEP** repo schema; extend without inventing facts. |
| Sitemap / robots | None (SPA shell with 200) | — | Real `sitemap.xml` / `robots.txt` | **KEEP**. |
| Canonical domain | `.co.uk` (does not resolve) | Owns "don't know"; ".co.uk — Advise us" | `NEXT_PUBLIC_SITE_URL`, default `https://www.stratfordcitymotorcars.com` | **KEEP** `.com` www. **External**: 301 apex → www at DNS/host; `.co.uk` only if the client acquires it. |
| Google Business Profile | None | No profile; "my company does not come up" on maps | Listed as a client item | **External**. Highest-impact local SEO action. |
| Social | None linked | Instagram and TikTok, dormant; handles not supplied | None | **CONFIRM** handles before adding `sameAs` or links. |
| AutoTrader | Not referenced | Used to be listed (~£1,200/month); HPI via Autotrader portal | Not referenced | No change. |
| Admin | `/admin` pages in SPA | Client will update stock themselves and wants training | Better-Auth scaffolding, open sign-up | **REPLACE** with an authenticated dealership dashboard; sign-up disabled (Phase 9). |

---

## 3. Legacy claims register

Every material claim on the legacy site, grouped. Quotes are verbatim.

| Claim (legacy) | Where | Decision | Reason |
| --- | --- | --- | --- |
| "Stratford's Premier Motor Group" | Home hero | DELETE | One site, two people; "not a dealer group". |
| "East London's Prestige Specialists"; "Prestige & Classic Cars for Sale" | About, Sales | DELETE | Positioning is sports and luxury; no specialism. |
| "We're a small, independent showroom and we like it that way." | Home | KEEP | Client: "don't touch it". |
| "We won't put something on the forecourt we wouldn't be happy to drive ourselves." | About | KEEP | Same answer. |
| "A family-feel showroom where you're always treated like a person, not a sale." | About | REWRITE | Family-run is confirmed; rewrite in the client's words. |
| "We've spent years getting to know what makes a great used car" | About | DELETE | About story "needs rewriting". |
| "Every car we sell is fully inspected and HPI clear" (and 10 variants) | Home, Sales, detail, FAQs, Terms, `/used-cars-stratford` | DELETE | "Most of them". Per-car status only. |
| "multi-point inspection", "comprehensive safety checks" | Mission, FAQs | DELETE | Not confirmed. |
| "Presented in immaculate condition with full service history" (every car) | Vehicle detail | DELETE | Hard-coded, not per car. |
| "AA warranty options up to 12 months"; per-car "{n} Month Warranty" | Meta, Home, detail, Terms, FAQ | DELETE | Third-party, sold separately; provider unnamed. |
| "We are a credit broker, not a lender, and work with FCA-regulated finance partners" | Finance, Terms | DELETE | No partners; status unknown. |
| "Quick Decisions… within hours — often the same day"; "same-day approvals"; "Pre-approval"; "all credit profiles considered"; "Competitive Rates" | Finance, FAQs, meta | DELETE | Unsupported financial promotion. |
| HP / PCP / Personal Loan descriptions, "Deposit from 10%", "Terms up to 5 years" | Finance | KEEP (loan minus "Quick approvals") | "all three, exactly as described". |
| "We'll provide an initial valuation within 24 hours" | Finance PX steps, FAQ | REWRITE | "Usually, on weekdays" → qualified wording. |
| "fair, honest valuation", "Top prices paid", "no haggling" | Home, `/used-cars-stratford` | DELETE | Not confirmed. |
| "within 5 minutes during business hours" | `/used-cars-stratford` | DELETE | Contradicted by "Same day" and missed enquiries. |
| "usually the same day"; "within 24 hours" (form toasts) | Contact | CONFIRM | Typical, but not a promise the client made. |
| "Reserve for £99"; "A deposit of £99-£500"; "non-refundable" | Detail, Terms | DELETE | Dead flow; client wants £100–£500 card deposit via a proper provider (CONFIRM terms). |
| "All prices include VAT"; "Every price we quote includes all applicable charges" | Detail, Mission | REWRITE / DELETE | Keep "VAT where applicable" only; fees "Sometimes" apply. |
| "Executive Hire"; "same-day hire"; "£39–£79 per day"; hire FAQs; Terms §3, 6.2, 7.2 | Title, meta, JSON-LD, FAQs, Terms | DELETE | "strip it from the site entirely"; hire is handled by City Chauffeurs. |
| "delivery within the London area" | FAQ | REPLACE | Nationwide delivery confirmed. |
| Six named testimonials with "✓ Verified Buyer" | Home, API | DELETE | Fabricated. |
| "Support sustainable choices with hybrid and EV options" | Mission | DELETE | No such stock or policy confirmed. |
| "supporting our local community through employment, partnerships" | Mission | DELETE | Unsupported. |
| "Professional indemnity insurance in place" | Terms 6.1 | DELETE | Unconfirmed. |
| Google Analytics / Ads remarketing described in Privacy and Cookies | Legal | DELETE | Not loaded; no analytics per client. |
| "Last updated: September 2024" | Legal | DELETE | The business has no written policies. |
| "Unit 12, Stratford Business Park"; "+44 0000 000000"; `sales@…co.uk` | JSON-LD | DELETE | Unknown to client. |
| "Sat Nav: E15 2BX" | Contact | REPLACE | E15 4LJ. |
| "5-minute walk from station"; "15 minutes by rail"; "25 minutes by car" | Contact | DELETE | Unverified journey times. |

---

## 4. Legacy URLs and redirect strategy

The legacy server answered `200` for everything, so none of these URLs is a
proven search asset. They are still redirected where a real equivalent exists,
because people bookmark and share links.

| Legacy URL | Legacy content | New behaviour | Why |
| --- | --- | --- | --- |
| `/` | Home | `/` | Same. |
| `/sales` | Stock list | **308 → `/vehicles`** | Direct equivalent. |
| `/sales/:slug` | Vehicle detail (lookup by slug) | **308 → `/vehicles/{new slug}`** when that car is currently public; otherwise **308 → `/vehicles`** | Legacy slugs differ from the rebuild's (below). Redirecting to a hidden car would land on a 404. |
| `/used-cars-stratford` | Landing page (no site chrome) | **308 → `/vehicles`** | Stock page is the equivalent. |
| `/mission` | Mission statement | **308 → `/about`** | Closest equivalent; mission content deleted. |
| `/about`, `/finance`, `/contact`, `/privacy`, `/terms`, `/cookies` | Same topics | Same paths | Kept. |
| `/finance#part-exchange` (footer "Part Exchange") | PX section | `/part-exchange` exists; `/finance` stays finance | No redirect needed (fragment). |
| `/hire`, `/hire/*` | Client-side 404 (hire only advertised in meta/JSON-LD) | **404** (not redirected) | No equivalent. Pointing hire traffic at a sales page would be a soft 404 and misleading; the not-found page offers stock and contact routes. |
| `/admin`, `/admin/dashboard`, `/admin/add-vehicle`, `/admin/edit-vehicle/:id` | Legacy staff area | **308 → `/login`** (noindex, disallowed in robots) | Staff who bookmarked the old admin land on the new sign-in. |
| `/robots.txt`, `/sitemap.xml` | SPA shell | Real files | New. |
| `/og-image.jpg`, `/logo.png` | SPA shell (broken refs) | 404 | Never real files. |

### Legacy vehicle slugs

| Legacy slug (`/sales/…`) | Rebuild slug (`/vehicles/…`) |
| --- | --- |
| `jaguar-xf-2012` | `jaguar-xf-2012` |
| `mercedes-ml63-amg-2006` | `mercedes-benz-ml63-amg-2006` |
| `mercedes-sl63-amg-2016` | `mercedes-benz-sl63-amg-2016` |
| `rolls-royce-corniche` | `rolls-royce-corniche-1999` |
| `rolls-royce-silver-shadow` | `rolls-royce-silver-shadow-1978` |
| `rolls-royce-dawn` | `rolls-royce-dawn-2016` |
| `porsche-macan-2014` | `porsche-macan-s-2014` |

Each record keeps its legacy slug in `previousSlugs`, which the `/sales/:slug`
handler resolves. The dashboard appends to the same list when a slug changes, so
shared links keep working after edits.

---

## 5. Legacy vehicle inventory

From `/api/vehicles`, 15 September 2026. Every record had `images: []`, the same
`createdAt` (2026-05-02T01:25:31.959Z), `hpiClear: true`, `available: true` and
`sold: false`.

| Legacy id | Car | Price | Mileage | Legacy warranty | Decision |
| --- | --- | --- | --- | --- | --- |
| v001 | 2012 Jaguar XF, Diesel, Auto, Midnight Black saloon | £16,000 | 68,000 | 3 months | **Draft.** Below the £20k range — can never publish at this price. Kept as history. |
| v002 | 2006 Mercedes-Benz ML63 AMG, Petrol, Auto, Silver SUV | £12,000 | 95,000 | 0 | **Draft.** Below range. Kept as history. |
| v003 | 2016 Mercedes-Benz SL63 AMG, Petrol, Auto, Obsidian Black convertible | £40,000 | 38,000 | 6 months | **Draft. CONFIRM** still for sale and price. |
| v004 | 1999 Rolls-Royce Corniche, Petrol, Auto, Silver Seraph convertible | £60,000 | 42,000 | 0 | **Draft.** Price confirmed wrong; candidate for POA (rare classic). **CONFIRM**. |
| v005 | 1978 Rolls-Royce Silver Shadow, Petrol, Auto, Silver saloon | £20,000 | 58,000 | 0 | **Draft. CONFIRM**. |
| v006 | 2016 Rolls-Royce Dawn, Petrol, Auto, Arctic White convertible | £30,000 | 28,000 | 12 months | **Draft.** Price confirmed wrong. **CONFIRM**. |
| v007 | 2014 Porsche Macan S, Petrol, Auto, Jet Black Metallic SUV | £25,000 | 62,000 | 3 months | **Draft. CONFIRM**. |

Migrated per record: make, model, year, mileage, price, fuel, gearbox, colour,
body, the car's own description and feature list — minus "HPI clear" wording.
Not migrated: `hpiClear` (→ `unknown`), `warrantyMonths` (→ availability
`null`), `available`/`sold` (→ `draft`), `createdAt` (seed timestamp, not a
listing date). None of the 30 cars the client actually holds is on the legacy
site; they must be entered through the dashboard.

---

## 6. Legacy media audit

| Asset | Size | Displayed | Issue | Decision |
| --- | --- | --- | --- | --- |
| Header logo `logo_v2_no_bg-x0x0mOLU.png` | 6250×3125 PNG, 1.72 MB | ~70 px tall, every page | ~40× oversized; blocks LCP on mobile | **REPLACE** with the rebuild's 900×269 WebP wordmark. |
| Favicon-style `Stratford City (1)…png` | 500×500 PNG, 10 KB | — | — | Superseded by `favicon.ico`. |
| Unsplash backgrounds (×5 URLs, 3 photos) | 1920×1080 / 1920×600 JPEG, 93–303 KB | Hero and section backgrounds, no alt | Stock photography of cars the dealership does not sell | **DELETE**. |
| Unsplash thumbnails | 400×300, 200×150 | Card fallbacks, alt `{vehicle.title}` | Stock image presented as the vehicle | **DELETE** — a stock image must never stand in for a dealer's car. |
| `og-image.jpg`, `logo.png` on `.co.uk` | — | Social previews, JSON-LD | Domain does not resolve | **REPLACE** with real `.com` assets. |
| Vehicle photographs | none (all `images: []`) | "Photography Coming Soon" | No photography exists | Dealer photography required before any car publishes. |

The rebuild's own `public/brand/og-default.jpg` still carries the retired line
"Prestige, performance & classic motorcars" — replaced in Phase 4.

---

## 7. Legacy SEO and structured data

- **Titles and descriptions:** set client-side only. Server HTML for every route
  carries "Prestige Used Cars & Executive Hire in Stratford | Stratford City
  Motor Cars" and "…AA warranty options, flexible finance, same-day hire
  available." Vehicle descriptions repeat the year ("2012 2012 Jaguar XF").
- **Robots:** Privacy/Terms/Cookies set `noindex, nofollow` client-side only; a
  crawler reading server HTML sees none of it.
- **JSON-LD (`index.html`):** an `AutoDealer` and a `CarRental` in one `@graph`
  with Unit 12 Stratford Business Park, postcode "E15", "+44 0000 000000",
  `sales@stratfordcitymotorcars.co.uk`, `openingHours` Mo–Sa 09:00–18:00 and
  Su 10:00–16:00, `priceRange` "££" (dealer) and "£39–£79 per day" (rental), and
  `url`/`logo` on `.co.uk`. A second, client-rendered block uses Romford Road
  with the wrong geo (51.5365, 0.0040). **Every factual claim in the static
  block is wrong.**
- **Keywords meta** targets "used cars E15", "HPI clear cars", "car loans E15".
- **Target now (intake):** "Car sales in east london"; buyers travel
  nationwide.

---

## 8. Where the intake changes earlier P0 / P0.5 decisions

P0 and P0.5 were done before the intake file was available in this workspace
and treated some statements as unconfirmed. With the intake in hand:

| Earlier decision | Intake evidence | Change |
| --- | --- | --- |
| "independent showroom" banned as an unconfirmed identity (P0.5 content check) | The exact line "We're a small, independent showroom and we like it that way" — "Yes — that's us, don't touch it" | Line restored verbatim on About. The check no longer bans "independent showroom"; it still bans "dealer group", "motor group", marque specialisms and commission claims. |
| "within 24 hours" removed as an unsupported guarantee | Four-step process "Yes — exactly that"; 24 h "Usually, on weekdays" | Restored only with the qualifier: "usually within 24 hours on weekdays". The check bans the unqualified form. |
| Company number and registered office withheld (office unconfirmed) | Company number 15481206 supplied; Companies House shows the registered office as 21–25 Romford Road, London E15 4LJ, the confirmed showroom | Company details rendered in the footer. |
| Preparation claim ("full service and MOT") removed | "What does that involve? Full service mot"; would not show prep per car | **Still withheld** — the intake describes current practice, not a published guarantee. Listed for confirmation. |
| "usually the same day" removed | Typical reply "Same day", but enquiries are missed "more than I'd like" | **Still withheld**. Listed for confirmation. |

---

## 9. Client confirmation register

Nothing in this list is published until confirmed.

1. Which of the 30 cars go online first, with prices (or POA) — none of the seven legacy records is confirmed.
2. Correct prices for the Dawn and Corniche, or POA.
3. Order and wording of the three promises (Trust and transparency, Quality standards, Personal service).
4. Public wording for vehicle preparation (service and MOT), if any.
5. Whether to promise a response time.
6. FCA status wording: credit broker, lender or introducer; FRN display.
7. Lender panel, representative APR and representative example (enables monthly figures).
8. Whether a finance calculator and soft-search check are wanted, and with which provider.
9. Reservation deposit amount (£100–£500), refund terms and payment provider.
10. Admin, documentation and delivery fees: amounts and when they apply.
11. Warranty provider name (optional), availability and term ranges per car.
12. Approved privacy policy, terms and conditions (including distance sales), complaints procedure, cookie policy.
13. Whether the business name should appear with "Ltd" in customer-facing copy beyond the legal footer.
14. Trading history wording (trading since 2019 vs incorporated 2024).
15. Instagram and TikTok handles, if they should be linked.
16. Contact form enquiry types ("Not sure").
17. The canonical domain (`www.stratfordcitymotorcars.com`) and who holds the registrar/DNS login ("the developer has it").
