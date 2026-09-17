#!/usr/bin/env node
/**
 * Inventory publishing regression check.
 *
 * Exercises the rules in packages/core/src/visibility.ts (shared with the admin
 * and the API server) against the real seed
 * records in data.ts and fixtures derived from them:
 *
 *  - the old £12,000 / £16,000 records stay hidden even if published and
 *    photographed (price outside the client's £20,000–£1,000,000 range)
 *  - POA cars are exempt from the price rule, and nothing else is
 *  - a car cannot be public without dealer exterior and interior photographs;
 *    library media does not count and never reaches the public view
 *  - drafts and archived cars are never public; sold cars keep their page
 *  - a publishable car must have its core details
 *  - the homepage features hand-picked cars only, with no fallback
 *  - repository.ts and the shared search route everything public through these rules
 *
 *   node scripts/check-inventory.mjs
 *
 * Dependency-free: Node strips the TypeScript types on import (Node 22.18+ /
 * 23.6+). visibility.ts and data.ts only use type imports, which is why they
 * can be loaded here without a bundler.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const src = (path) => new URL(`../src/lib/inventory/${path}`, import.meta.url);
const domain = (path) => new URL(`../../../packages/domain/src/inventory/${path}`, import.meta.url);

const { seedVehicles } = await import(src("data.ts"));
const {
  LISTING_PHOTO_TARGET,
  PUBLIC_PRICE_RANGE,
  isPubliclyVisible,
  listingRecommendations,
  publicBlockers,
  publicationIssues,
  selectFeatured,
  toPublicVehicle,
} = await import(src("visibility.ts"));

const results = [];
function check(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error });
  }
}

let nextId = 0;
const photo = (category, provenance = "dealer") => ({
  id: `fixture-${category}-${provenance}-${(nextId += 1)}`,
  kind: "image",
  src: `/media/fixture/${category}-${nextId}.webp`,
  alt: `Fixture ${category}`,
  width: 2400,
  height: 1600,
  category,
  provenance,
});
const fullyPhotographed = () => [photo("exterior"), photo("interior")];
const bySlug = (slug) => {
  const vehicle = seedVehicles.find((v) => v.slug === slug);
  assert.ok(vehicle, `expected a record with slug ${slug} in data.ts`);
  return structuredClone(vehicle);
};
/** A seed record as if the dealership had published it with full photography. */
const publishedWithPhotos = (slug) => ({ ...bySlug(slug), status: "published", media: fullyPhotographed() });
const codes = (record) => publicBlockers(record).map((issue) => issue.code);

// ---- Old inventory ---------------------------------------------------------

check("old £16k Jaguar XF and £12k ML63 AMG records are still kept", () => {
  assert.equal(bySlug("jaguar-xf-2012").price, 16_000);
  assert.equal(bySlug("mercedes-benz-ml63-amg-2006").price, 12_000);
});

check("old £12k/£16k records stay hidden even when published and photographed", () => {
  for (const slug of ["jaguar-xf-2012", "mercedes-benz-ml63-amg-2006"]) {
    const record = publishedWithPhotos(slug);
    assert.equal(isPubliclyVisible(record), false, `${slug} became visible`);
    assert.deepEqual(codes(record), ["price-out-of-range"]);
    assert.equal(toPublicVehicle(record), null);
  }
});

check("price range is £20,000–£1,000,000 inclusive", () => {
  const base = publishedWithPhotos("mercedes-benz-sl63-amg-2016");
  assert.equal(PUBLIC_PRICE_RANGE.min, 20_000);
  assert.equal(PUBLIC_PRICE_RANGE.max, 1_000_000);
  assert.equal(isPubliclyVisible({ ...base, price: 19_999 }), false);
  assert.equal(isPubliclyVisible({ ...base, price: 20_000 }), true);
  assert.equal(isPubliclyVisible({ ...base, price: 1_000_000 }), true);
  assert.equal(isPubliclyVisible({ ...base, price: 1_000_001 }), false);
});

check("a car with no price is blocked unless it is POA", () => {
  const base = publishedWithPhotos("rolls-royce-corniche-1999");
  assert.deepEqual(codes({ ...base, price: null }), ["missing-price"]);
  assert.equal(isPubliclyVisible({ ...base, price: null, priceOnApplication: true }), true);
});

check("POA does not bypass any other rule", () => {
  const record = { ...bySlug("jaguar-xf-2012"), status: "published", priceOnApplication: true, media: [] };
  assert.deepEqual(codes(record), ["missing-exterior-photography", "missing-interior-photography"]);
});

check("every seed record is a draft and none is public", () => {
  assert.equal(seedVehicles.length, 7);
  for (const record of seedVehicles) assert.equal(record.status, "draft", record.slug);
  assert.deepEqual(seedVehicles.filter(isPubliclyVisible).map((v) => v.slug), []);
});

check("seed records carry no unsupported HPI or warranty claims", () => {
  for (const record of seedVehicles) {
    assert.equal(record.hpiStatus, "unknown", record.slug);
    assert.equal(record.warranty.available, null, record.slug);
    assert.doesNotMatch(`${record.description} ${record.features.join(" ")}`, /HPI/i, record.slug);
  }
});

check("legacy /sales slugs are preserved for redirects", () => {
  assert.deepEqual(bySlug("rolls-royce-dawn-2016").previousSlugs, ["rolls-royce-dawn"]);
  assert.deepEqual(bySlug("porsche-macan-s-2014").previousSlugs, ["porsche-macan-2014"]);
});

// ---- Photography gate ------------------------------------------------------

check("published in-range car with no photographs is hidden", () => {
  const record = { ...publishedWithPhotos("mercedes-benz-sl63-amg-2016"), media: [] };
  assert.deepEqual(codes(record), ["missing-exterior-photography", "missing-interior-photography"]);
});

check("library media does not satisfy the photography gate", () => {
  const record = {
    ...publishedWithPhotos("mercedes-benz-sl63-amg-2016"),
    media: [photo("exterior", "library"), photo("interior", "library")],
  };
  assert.equal(isPubliclyVisible(record), false);
});

check("the Dawn's library image alone does not publish it", () => {
  const dawn = { ...bySlug("rolls-royce-dawn-2016"), status: "published" };
  assert.ok(dawn.media.some((item) => item.provenance === "library"));
  assert.equal(isPubliclyVisible(dawn), false);
});

check("exterior-only dealer photography is not enough (interiors required)", () => {
  const record = { ...publishedWithPhotos("mercedes-benz-sl63-amg-2016"), media: [photo("exterior"), photo("exterior")] };
  assert.deepEqual(codes(record), ["missing-interior-photography"]);
});

check("interior-only dealer photography is not enough", () => {
  const record = { ...publishedWithPhotos("mercedes-benz-sl63-amg-2016"), media: [photo("interior")] };
  assert.deepEqual(codes(record), ["missing-exterior-photography"]);
});

check("detail and documents photographs do not count towards the minimum", () => {
  const record = { ...publishedWithPhotos("mercedes-benz-sl63-amg-2016"), media: [photo("detail"), photo("documents")] };
  assert.deepEqual(codes(record), ["missing-exterior-photography", "missing-interior-photography"]);
});

check("published, complete, in range, dealer exterior + interior → public", () => {
  assert.equal(isPubliclyVisible(publishedWithPhotos("mercedes-benz-sl63-amg-2016")), true);
});

check("the public view drops library media and resolves the cover", () => {
  const exterior = photo("exterior");
  const interior = photo("interior");
  const library = photo("exterior", "library");
  const record = {
    ...publishedWithPhotos("mercedes-benz-sl63-amg-2016"),
    media: [interior, library, exterior],
  };
  const view = toPublicVehicle(record);
  assert.ok(view);
  assert.equal(view.cover.id, exterior.id, "cover falls back to the first dealer exterior");
  assert.deepEqual(view.images.map((image) => image.id), [exterior.id, interior.id]);
  assert.ok(!("media" in view), "raw media must not be exposed");

  const explicit = toPublicVehicle({ ...record, coverImageId: interior.id });
  assert.equal(explicit.cover.id, interior.id);
  const libraryCover = toPublicVehicle({ ...record, coverImageId: library.id });
  assert.equal(libraryCover.cover.id, exterior.id, "a library image can never be the cover");
});

check("public photographs always carry alt text", () => {
  const exterior = { ...photo("exterior"), alt: "" };
  const interior = { ...photo("interior"), alt: "   " };
  const view = toPublicVehicle({ ...publishedWithPhotos("mercedes-benz-sl63-amg-2016"), media: [exterior, interior] });
  assert.ok(view);
  for (const image of view.images) assert.match(image.alt, /2016 Mercedes-Benz SL63 AMG, (exterior|interior) photograph/);
  assert.ok(
    listingRecommendations({ ...publishedWithPhotos("mercedes-benz-sl63-amg-2016"), media: [exterior, interior] }).some((tip) =>
      tip.message.includes("no description"),
    ),
  );
});

// ---- Lifecycle and required details ------------------------------------------

check("drafts and archived cars are never public, however complete", () => {
  const complete = publishedWithPhotos("mercedes-benz-sl63-amg-2016");
  assert.deepEqual(codes({ ...complete, status: "draft" }), ["not-published"]);
  assert.deepEqual(codes({ ...complete, status: "archived" }), ["not-published"]);
});

check("a sold car keeps its page and is marked sold", () => {
  const view = toPublicVehicle({ ...publishedWithPhotos("mercedes-benz-sl63-amg-2016"), status: "sold" });
  assert.ok(view);
  assert.equal(view.isSold, true);
  assert.equal(view.isNewArrival, false);
});

check("a sold car still has to pass the publishing rules", () => {
  const record = { ...bySlug("mercedes-benz-sl63-amg-2016"), status: "sold" };
  assert.equal(toPublicVehicle(record), null);
});

check("a publishable car must have its core details", () => {
  const record = {
    ...publishedWithPhotos("mercedes-benz-sl63-amg-2016"),
    title: "",
    make: " ",
    model: "",
    year: null,
    mileage: null,
    fuel: null,
    transmission: null,
    bodyType: null,
    colour: "",
    description: "",
    slug: "Not A Slug",
  };
  assert.deepEqual(codes(record).sort(), [
    "invalid-slug",
    "missing-body-type",
    "missing-colour",
    "missing-description",
    "missing-fuel",
    "missing-make",
    "missing-mileage",
    "missing-model",
    "missing-title",
    "missing-transmission",
    "missing-year",
  ]);
  for (const issue of publicationIssues(record)) {
    assert.ok(issue.message.length > 10, `${issue.code} needs a human message`);
  }
});

check("the 20+ photo target is a recommendation, not a requirement", () => {
  const record = publishedWithPhotos("mercedes-benz-sl63-amg-2016");
  assert.equal(LISTING_PHOTO_TARGET, 20);
  assert.equal(isPubliclyVisible(record), true);
  assert.ok(listingRecommendations(record).some((tip) => tip.message.includes("20+")));
});

// ---- Featured selection ----------------------------------------------------

const car = (id, featured, isSold = false) => ({ id, featured, isSold });

check("homepage features nothing when nothing is hand-picked (no fallback)", () => {
  assert.deepEqual(selectFeatured([car("a", false), car("b", false), car("c", false)], 4), []);
});

check("homepage never pads featured cars with other stock", () => {
  const picked = selectFeatured(
    [car("a", false), car("b", true), car("c", false), car("d", true), car("e", false)],
    4,
  );
  assert.deepEqual(picked.map((v) => v.id), ["b", "d"]);
});

check("sold cars are not featured, and the limit is respected", () => {
  const picked = selectFeatured(
    [car("a", true, true), car("b", true), car("c", true), car("d", true), car("e", true)],
    3,
  );
  assert.deepEqual(picked.map((v) => v.id), ["b", "c", "d"]);
});

// ---- Wiring ----------------------------------------------------------------

const withoutComments = (url) =>
  readFileSync(fileURLToPath(url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

check("repository.ts routes everything public through visibility.ts", () => {
  const source = withoutComments(src("repository.ts"));
  const search = withoutComments(domain("search.ts"));
  assert.match(source, /toPublicVehicle\(record/, "loadPublicVehicles() must apply toPublicVehicle");
  assert.match(source, /getFeaturedVehicles[\s\S]*?featuredVehicles\(/, "getFeaturedVehicles() must use the shared featuredVehicles");
  assert.match(search, /function featuredVehicles[\s\S]*?selectFeatured\(/, "featuredVehicles() must use selectFeatured");
  for (const [name, text] of [["repository.ts", source], ["search.ts", search]]) {
    assert.doesNotMatch(text, /!\s*[\w.]*\.featured\b/, `${name} must not select non-featured cars`);
  }
  assert.doesNotMatch(source, /store\.list\(\)[\s\S]*?\.map\(\s*\(?\w+\)?\s*=>\s*\w+\s*\)/, "records must not bypass the public view");
});

// ---- Report ----------------------------------------------------------------

const failures = results.filter((result) => !result.ok);
for (const result of results) {
  console.log(`${result.ok ? "  ok  " : "  FAIL"}  ${result.name}`);
  if (!result.ok) console.log(`        ${String(result.error.message).split("\n").join("\n        ")}`);
}

if (failures.length > 0) {
  console.error(`\nInventory check failed — ${failures.length} of ${results.length} checks.`);
  process.exit(1);
}
console.log(`\nInventory check passed (${results.length} checks).`);
