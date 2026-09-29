import { randomUUID } from "node:crypto";
import { tables } from "@Stratford-city-motorcars-Ltd/db";

import type { db } from "../../lib/db";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface Deletion {
  entity: "enquiry" | "customer";
  entityId: string;
  reference?: string | null;
  reason: string;
  deletedBy: string;
}

/** The SQLSTATE of a Postgres error, which drizzle wraps in `cause`. */
function pgCode(error: unknown): string | undefined {
  const candidates = [error, (error as { cause?: unknown } | null)?.cause];
  for (const candidate of candidates) {
    const code = (candidate as { code?: unknown } | null)?.code;
    if (typeof code === "string") return code;
  }
  return undefined;
}

/**
 * Records deletions in `deletion_log`, inside the deleting transaction so both
 * happen or neither. Until the migration that creates the table has run
 * (0002), the insert fails with "undefined table"; the deletion — an erasure
 * request, say — must still go ahead, so the insert runs in a savepoint and
 * only that error is tolerated and logged.
 */
export async function logDeletions(tx: Transaction, deletions: Deletion[]): Promise<void> {
  if (!deletions.length) return;
  try {
    await tx.transaction(async (savepoint) => {
      await savepoint.insert(tables.deletionLog).values(
        deletions.map((deletion) => ({
          id: randomUUID(),
          entity: deletion.entity,
          entityId: deletion.entityId,
          reference: deletion.reference ?? null,
          reason: deletion.reason,
          deletedBy: deletion.deletedBy,
        })),
      );
    });
  } catch (error) {
    if (pgCode(error) !== "42P01") throw error;
    console.warn("[admin] deletion_log does not exist yet: run the database migrations. The deletion went ahead unrecorded.");
  }
}
