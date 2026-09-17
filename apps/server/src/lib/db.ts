import { getDb } from "@Stratford-city-motorcars-Ltd/db";
import { env } from "@Stratford-city-motorcars-Ltd/env/server";

/** The process-wide connection pool. */
export const db = getDb(env.DATABASE_URL);

/** True when Postgres raised a unique violation on `constraint`. Drizzle wraps the driver error in `cause`. */
export function isUniqueViolation(error: unknown, constraint: string): boolean {
  const candidates = [error, (error as { cause?: unknown })?.cause];
  return candidates.some(
    (candidate) =>
      !!candidate &&
      typeof candidate === "object" &&
      (candidate as { code?: string }).code === "23505" &&
      (candidate as { constraint?: string }).constraint === constraint,
  );
}
