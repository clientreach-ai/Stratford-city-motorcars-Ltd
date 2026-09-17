import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorisedError,
  ValidationError,
} from "@Stratford-city-motorcars-Ltd/core/errors";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/**
 * Response conventions.
 *
 * Errors follow the admin contract (docs/STRATFORD_ADMIN_CONTRACT.md):
 *
 *   { "error": "Plain-English message", "code": "stable_code", …extras }
 *
 *   401  UnauthorisedError
 *   403  ForbiddenError      + capability
 *   404  NotFoundError
 *   409  ConflictError       + currentUpdatedAt
 *   422  ValidationError     + fields { path: message }, issues
 *
 * Services throw the error classes from packages/core; `handleError` turns
 * them into responses. Messages are written for the dealership and never leak
 * an internal cause.
 *
 * Public endpoints wrap success in `{ data, meta? }`; admin endpoints return
 * the contract's shapes directly.
 */

export class HttpError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: string,
    message: string,
    readonly extras: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const notFound = (what = "Resource") => new HttpError(404, "not_found", `${what} not found.`);

export function ok<T>(c: Context, data: T, status: ContentfulStatusCode = 200, meta?: Record<string, unknown>) {
  return c.json(meta ? { data, meta } : { data }, status);
}

export function errorBody(code: string, message: string, extras: Record<string, unknown> = {}) {
  return { error: message, code, ...extras };
}

export function handleError(error: Error, c: Context) {
  if (error instanceof HttpError) {
    return c.json(errorBody(error.code, error.message, error.extras), error.status);
  }
  if (error instanceof ValidationError) {
    return c.json(errorBody("validation_failed", error.message, { fields: error.fields, issues: error.issues }), 422);
  }
  if (error instanceof ConflictError) {
    return c.json(errorBody("conflict", error.message, { currentUpdatedAt: error.currentUpdatedAt }), 409);
  }
  if (error instanceof ForbiddenError) {
    return c.json(errorBody("forbidden", error.message, { capability: error.capability }), 403);
  }
  if (error instanceof NotFoundError) return c.json(errorBody("not_found", error.message), 404);
  if (error instanceof UnauthorisedError) return c.json(errorBody("unauthenticated", error.message), 401);

  // Hono's own HTTPException (body limit, malformed JSON…).
  if ("getResponse" in error && typeof error.getResponse === "function") {
    const status = (error as { status?: number }).status ?? 500;
    return c.json(
      errorBody(status === 413 ? "payload_too_large" : "bad_request", error.message || "Bad request."),
      status as ContentfulStatusCode,
    );
  }
  console.error(`[api] ${c.req.method} ${c.req.path} failed (request ${c.get("requestId") as string | undefined}):`, error);
  return c.json(errorBody("internal_error", "Something went wrong on the server. Nothing was changed."), 500);
}

export function handleNotFound(c: Context) {
  return c.json(errorBody("not_found", `No route for ${c.req.method} ${c.req.path}.`), 404);
}
