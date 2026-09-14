#!/usr/bin/env node
/**
 * Inventory publishing regression check.
 *
 * Exercises the rules in src/lib/inventory/visibility.ts against the real
 * records in data.ts and small fixtures derived from them:
 *
 *  - the old £12,000 / £16,000 records stay hidden even if published and
 *    photographed (price outside the client's normal stock range)
 *  - a car cannot be public without the dealership's own exterior and
 *    interior photographs; library stand-ins do not count
 *  - the homepage features hand-picked cars only, with no fallback to other
 *    stock
 *  - repository.ts actually routes visibility and featuring through those
 *    rules
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

const { vehicles } = await import(src("data.ts"));
const { PUBLIC_PRICE_RANGE, isPubliclyVisible, publicationBlockers, selectFeatured } =
  await import(src("visibility.ts"));

const results = [];
function check(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error });
  }
}

const photo = (view, provenance = "dealer") => ({
  src: `/vehicles/fixture/${view}.webp`,
  alt: `Fixture ${view}`,
  width: 2400,
  height: 1600,
  provenance,
  view,
});
const fullyPhotographed = [photo("exterior"), photo("interior")];
const bySlug = (slug) => {
  const vehicle = vehicles.find((v) => v.slug === slug);
  assert.ok(vehicle, `expected a record with slug ${slug} in data.ts`);
  return vehicle;
};
/** A record as if someone had published it and supplied full photography. */
const publishedWithPhotos = (vehicle) => ({ ...vehicle, published: true, images: fullyPhotographed });

// ---- Old inventory ---------------------------------------------------------

check("old £16k Jaguar XF and £12k ML63 AMG records are still kept", () => {
  assert.equal(bySlug("jaguar-xf-2012").price, 16_000);
  assert.equal(bySlug("mercedes-benz-ml63-amg-2006").price, 12_000);
});

check("old £12k/£16k records stay hidden even when published and photographed", () => {
  for (const slug of ["jaguar-xf-2012", "mercedes-benz-ml63-amg-2006"]) {
    const vehicle = publishedWithPhotos(bySlug(slug));
    assert.equal(isPubliclyVisible(vehicle), false, `${slug} became visible`);
    assert.deepEqual(publicationBlockers(vehicle), ["price-out-of-range"]);
  }
});

check("price range is £20,000–£1,000,000 inclusive", () => {
  const base = publishedWithPhotos(bySlug("mercedes-benz-sl63-amg-2016"));
  assert.equal(PUBLIC_PRICE_RANGE.min, 20_000);
  assert.equal(PUBLIC_PRICE_RANGE.max, 1_000_000);
  assert.equal(isPubliclyVisible({ ...base, price: 19_999 }), false);
  assert.equal(isPubliclyVisible({ ...base, price: 20_000 }), true);
  assert.equal(isPubliclyVisible({ ...base, price: 1_000_000 }), true);
  assert.equal(isPubliclyVisible({ ...base, price: 1_000_001 }), false);
});

check("no record in data.ts is currently public", () => {
  // Every record is unpublished and unphotographed today. Update this check
  // when the client confirms a car and its dealer photographs are added.
  const visible = vehicles.filter(isPubliclyVisible).map((v) => v.slug);
  assert.deepEqual(visible, []);
});

// ---- Photography gate ------------------------------------------------------

check("published in-range car with no photographs is hidden", () => {
  const vehicle = { ...bySlug("mercedes-benz-sl63-amg-2016"), published: true, images: [] };
  assert.deepEqual(publicationBlockers(vehicle), [
    "missing-exterior-photography",
    "missing-interior-photography",
  ]);
});

check("library stand-ins do not satisfy the photography gate", () => {
  const vehicle = {
    ...bySlug("mercedes-benz-sl63-amg-2016"),
    published: true,
    images: [photo("exterior", "library"), photo("interior", "library")],
    libraryImages: [photo("exterior", "library")],
  };
  assert.equal(isPubliclyVisible(vehicle), false);
});

check("the Dawn's library image alone does not publish it", () => {
  const dawn = bySlug("rolls-royce-dawn-2016");
  assert.ok(dawn.libraryImages.length > 0);
  assert.equal(isPubliclyVisible({ ...dawn, published: true }), false);
});

check("exterior-only dealer photography is not enough (interiors required)", () => {
  const vehicle = {
    ...bySlug("mercedes-benz-sl63-amg-2016"),
    published: true,
    images: [photo("exterior"), photo("exterior")],
  };
  assert.deepEqual(publicationBlockers(vehicle), ["missing-interior-photography"]);
});

check("interior-only dealer photography is not enough", () => {
  const vehicle = { ...bySlug("mercedes-benz-sl63-amg-2016"), published: true, images: [photo("interior")] };
  assert.deepEqual(publicationBlockers(vehicle), ["missing-exterior-photography"]);
});

check("published, in range, dealer exterior + interior photographs → public", () => {
  assert.equal(isPubliclyVisible(publishedWithPhotos(bySlug("mercedes-benz-sl63-amg-2016"))), true);
});

check("an unpublished car stays hidden however complete it is", () => {
  const vehicle = { ...publishedWithPhotos(bySlug("mercedes-benz-sl63-amg-2016")), published: false };
  assert.deepEqual(publicationBlockers(vehicle), ["not-published"]);
});

// ---- Featured selection ----------------------------------------------------

const car = (id, featured, status = "available") => ({ id, featured, status });

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
    [car("a", true, "sold"), car("b", true), car("c", true, "reserved"), car("d", true), car("e", true)],
    3,
  );
  assert.deepEqual(picked.map((v) => v.id), ["b", "c", "d"]);
});

// ---- Wiring ----------------------------------------------------------------

check("repository.ts routes visibility and featuring through visibility.ts", () => {
  const source = readFileSync(fileURLToPath(src("repository.ts")), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  assert.match(source, /staticVehicles\.filter\([\s\S]*?publicationBlockers\(/, "loadVehicles() must apply publicationBlockers");
  assert.match(source, /getFeaturedVehicles[\s\S]*?selectFeatured\(/, "getFeaturedVehicles() must use selectFeatured");
  assert.doesNotMatch(source, /!\s*[\w.]*\.featured\b/, "repository.ts must not select non-featured cars");
});

// ---- Report ----------------------------------------------------------------

const failures = results.filter((result) => !result.ok);
for (const result of results) {
  console.log(`${result.ok ? "  ok  " : "  FAIL"}  ${result.name}`);
  if (!result.ok) console.log(`        ${result.error.message.split("\n").join("\n        ")}`);
}

if (failures.length > 0) {
  console.error(`\nInventory check failed — ${failures.length} of ${results.length} checks.`);
  process.exit(1);
}
console.log(`\nInventory check passed (${results.length} checks).`);
