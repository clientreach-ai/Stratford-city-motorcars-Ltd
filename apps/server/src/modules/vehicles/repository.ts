import { desc, eq, tables, type Database } from "@Stratford-city-motorcars-Ltd/db";
import type { Reservation, SaleRecord } from "@Stratford-city-motorcars-Ltd/core/stock";
import type { VehicleRecord } from "@Stratford-city-motorcars-Ltd/core/vehicle";
import { parseVehicleRecord } from "@Stratford-city-motorcars-Ltd/domain/inventory/schema";

import { db } from "../../lib/db";

/**
 * Vehicle persistence. The same `vehicle` table the website reads: each record
 * is a validated JSON document, with `slug`, `status` and `featured` copied into
 * columns. Records are validated on every read and every write, exactly as the
 * website does, so a malformed document never reaches a page or a response.
 *
 * `reservation` and `sale` are dealership-only and live in their own columns,
 * never inside `record`.
 */

const { vehicle } = tables;

export type Executor = Pick<Database, "select" | "insert" | "update" | "delete">;

export interface StoredVehicle {
  record: VehicleRecord;
  reservation: Reservation | null;
  sale: SaleRecord | null;
}

type Row = { id: string; record: unknown; reservation: unknown; sale: unknown };

const columns = {
  id: vehicle.id,
  record: vehicle.record,
  reservation: vehicle.reservation,
  sale: vehicle.sale,
};

function parseRow(row: Row): StoredVehicle | null {
  try {
    return {
      record: parseVehicleRecord(row.record),
      reservation: (row.reservation as Reservation | null) ?? null,
      sale: (row.sale as SaleRecord | null) ?? null,
    };
  } catch (error) {
    const paths =
      error && typeof error === "object" && "issues" in error
        ? (error as { issues: { path: PropertyKey[] }[] }).issues.map((issue) => issue.path.join("."))
        : [];
    console.error(`[vehicles] ${row.id} failed validation and was skipped`, paths);
    return null;
  }
}

/** Every vehicle in any status, most recently changed first. */
export async function listVehicles(): Promise<StoredVehicle[]> {
  const rows = await db.select(columns).from(vehicle).orderBy(desc(vehicle.updatedAt));
  return rows.map(parseRow).filter((row): row is StoredVehicle => row !== null);
}

export async function findVehicle(id: string, executor: Executor = db): Promise<StoredVehicle | null> {
  const [row] = await executor.select(columns).from(vehicle).where(eq(vehicle.id, id)).limit(1);
  return row ? parseRow(row) : null;
}

/**
 * Runs `work` with the vehicle row locked, so a save and a photo upload for the
 * same car can never overwrite each other.
 */
export async function withLockedVehicle<T>(
  id: string,
  work: (stored: StoredVehicle | null, tx: Executor) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    const [row] = await tx.select(columns).from(vehicle).where(eq(vehicle.id, id)).for("update").limit(1);
    return work(row ? parseRow(row) : null, tx);
  });
}

/** Insert or replace a vehicle. The record is validated first. */
export async function writeVehicle(stored: StoredVehicle, executor: Executor = db): Promise<StoredVehicle> {
  const record = parseVehicleRecord(stored.record);
  const values = {
    id: record.id,
    slug: record.slug,
    status: record.status,
    featured: record.featured,
    record,
    reservation: stored.reservation,
    sale: stored.sale,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  };
  await executor
    .insert(vehicle)
    .values(values)
    .onConflictDoUpdate({
      target: vehicle.id,
      set: {
        slug: values.slug,
        status: values.status,
        featured: values.featured,
        record: values.record,
        reservation: values.reservation,
        sale: values.sale,
        updatedAt: values.updatedAt,
      },
    });
  return { record, reservation: stored.reservation, sale: stored.sale };
}
