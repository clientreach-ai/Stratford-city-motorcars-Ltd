import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

/**
 * Limits that keep a slow or unreachable database from hanging a page render,
 * an enquiry or an admin request: each fails within seconds instead, and the
 * caller's own error handling takes over.
 *
 * The query limit is enforced by the driver, not by Postgres: Neon's pooler
 * ignores `statement_timeout` as a connection setting and refuses the
 * connection outright when it is sent through `options`.
 */
const CONNECT_TIMEOUT_MS = 10_000; // long enough for a Neon compute waking from idle
const QUERY_TIMEOUT_MS = 15_000;
const IDLE_TIMEOUT_MS = 30_000;

export function createDb(connectionString: string): Database {
  const pool = new Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
    idleTimeoutMillis: IDLE_TIMEOUT_MS,
    query_timeout: QUERY_TIMEOUT_MS,
    keepAlive: true,
  });

  // An idle connection closed by the server (a Neon restart, scale to zero,
  // pooler recycling) is reported here. The pool has already discarded it and
  // opens a fresh one on the next query. Without a listener Node treats the
  // event as an uncaught exception and the whole process exits.
  pool.on("error", (error) => {
    console.error(`[db] idle connection closed: ${error.message}`);
  });

  return drizzle({ client: pool, schema });
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

/**
 * Query helpers from the same drizzle-orm instance as the tables. Consumers
 * import them from here so there is never a second copy with incompatible types.
 */
export { and, asc, count, desc, eq, gte, inArray, lt, ne, or, sql, type SQL } from "drizzle-orm";

export { emailKey, phoneKey, recordWebsiteEnquiry, type WebsiteEnquiry } from "./enquiries";
