import "server-only";

import { seedVehicles } from "../data";
import { StoreNotWritableError, type InventoryStore } from "../store";

/** Read-only store over the seed records, used when no database is configured. */
export function createSeedStore(): InventoryStore {
  return {
    kind: "seed",
    writable: false,
    async list() {
      return structuredClone(seedVehicles);
    },
    async getById(id) {
      const match = seedVehicles.find((vehicle) => vehicle.id === id);
      return match ? structuredClone(match) : null;
    },
    async save() {
      throw new StoreNotWritableError();
    },
  };
}
