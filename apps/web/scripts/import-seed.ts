/**
 * Imports the seed records from src/lib/inventory/data.ts into the database,
 * as drafts. Safe to run more than once: a record whose id already exists is
 * left untouched, so dashboard edits are never overwritten.
 *
 *   DATABASE_URL=… pnpm --filter web inventory:import-seed
 *
 * Runs with Bun (TypeScript and workspace packages without a build step).
 */
import { getDb, tables } from "@Stratford-city-motorcars-Ltd/db";

import { seedVehicles } from "../src/lib/inventory/data";
import { parseVehicleRecord } from "../src/lib/inventory/schema";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL is not set. Nothing was imported.");
  process.exit(1);
}

const db = getDb(url);
let inserted = 0;

for (const seed of seedVehicles) {
  const record = parseVehicleRecord({ ...seed, status: "draft", featured: false });
  const rows = await db
    .insert(tables.vehicle)
    .values({
      id: record.id,
      slug: record.slug,
      status: record.status,
      featured: record.featured,
      record,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
    })
    .onConflictDoNothing()
    .returning({ id: tables.vehicle.id });
  if (rows.length) inserted += 1;
  console.log(`${rows.length ? "imported" : "skipped (exists)"}  ${record.id}  ${record.slug}`);
}

console.log(`\n${inserted} of ${seedVehicles.length} seed records imported as drafts.`);
process.exit(0);
