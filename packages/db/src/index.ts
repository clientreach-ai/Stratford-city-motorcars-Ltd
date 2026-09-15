import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";

import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

export function createDb(connectionString: string): Database {
  return drizzle(connectionString, { schema });
}

const globalForDb = globalThis as unknown as { __scmDb?: { url: string; db: Database } };

/**
 * One connection pool per process. Development hot reloads re-evaluate modules,
 * so the pool is kept on `globalThis` rather than in module scope.
 */
export function getDb(connectionString: string): Database {
  const cached = globalForDb.__scmDb;
  if (cached && cached.url === connectionString) return cached.db;
  const db = createDb(connectionString);
  globalForDb.__scmDb = { url: connectionString, db };
  return db;
}

export * as tables from "./schema";
