import "server-only";

import type { VehicleRecord } from "./types";

/**
 * ============================================================================
 * INVENTORY STORE — the single source of truth for vehicle records.
 * ============================================================================
 *
 * The public site and the dashboard both read through this interface, so there
 * is exactly one inventory. Which implementation backs it depends on the
 * environment:
 *
 *  - `DATABASE_URL` set   → Postgres (read/write). The dashboard edits stock
 *                           and the public site reflects it.
 *  - `DATABASE_URL` unset → the seed records in `data.ts` (read-only). The
 *                           public site builds and runs without a database;
 *                           the dashboard explains that storage is not
 *                           connected.
 *
 * Build and runtime must use the same `DATABASE_URL`, or pages prerendered from
 * one source will be served while the other is being edited.
 */
export interface InventoryStore {
  readonly kind: "seed" | "postgres";
  readonly writable: boolean;
  /** Every record, in any status. Callers decide what is public. */
  list(): Promise<VehicleRecord[]>;
  getById(id: string): Promise<VehicleRecord | null>;
  /** Insert or replace a record. Throws `StoreNotWritableError` or `SlugConflictError`. */
  save(record: VehicleRecord): Promise<VehicleRecord>;
}

export class StoreNotWritableError extends Error {
  constructor() {
    super("Inventory storage is not connected, so changes cannot be saved.");
    this.name = "StoreNotWritableError";
  }
}

export class SlugConflictError extends Error {
  constructor(readonly slug: string) {
    super(`Another car already uses the web address “${slug}”.`);
    this.name = "SlugConflictError";
  }
}

export function databaseUrl(): string | undefined {
  const value = process.env.DATABASE_URL?.trim();
  return value ? value : undefined;
}

const globalForStore = globalThis as unknown as { __scmInventoryStore?: InventoryStore };

export async function getInventoryStore(): Promise<InventoryStore> {
  if (globalForStore.__scmInventoryStore) return globalForStore.__scmInventoryStore;

  const url = databaseUrl();
  const store = url
    ? (await import("./stores/postgres")).createPostgresStore(url)
    : (await import("./stores/seed")).createSeedStore();

  globalForStore.__scmInventoryStore = store;
  return store;
}
