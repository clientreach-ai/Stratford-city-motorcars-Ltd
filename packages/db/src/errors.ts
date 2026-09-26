import { DrizzleQueryError } from "drizzle-orm";

/**
 * A one-line summary of an error that is safe to write to the logs.
 *
 * Drizzle's query errors put the query's parameters — customer names, email
 * addresses and phone numbers — in their message, and Postgres's own messages
 * and `detail` can quote the values too. A database error is therefore
 * summarised by its SQLSTATE code, constraint and table only; any other error
 * (a timeout, a refused connection) by its name and message.
 */
export function describeError(error: unknown): string {
  const cause = error instanceof DrizzleQueryError ? error.cause : error;
  if (cause && typeof cause === "object") {
    const { code, constraint, table } = cause as { code?: unknown; constraint?: unknown; table?: unknown };
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) {
      return [`postgres ${code}`, typeof table === "string" && `table=${table}`, typeof constraint === "string" && `constraint=${constraint}`]
        .filter(Boolean)
        .join(" ");
    }
  }
  if (cause instanceof Error) return `${cause.name}: ${cause.message}`.slice(0, 300);
  return error instanceof DrizzleQueryError ? "DrizzleQueryError" : "unknown error";
}

/**
 * Where an error was thrown, without its message (see describeError). Only the
 * `at …` lines are kept: a message can span several lines, and a failed
 * query's second line is its parameters.
 */
export function errorFrames(error: unknown, depth = 6): string {
  if (!(error instanceof Error) || !error.stack) return "";
  return error.stack
    .split("\n")
    .filter((line) => /^\s+at /.test(line))
    .slice(0, depth)
    .join("\n");
}
