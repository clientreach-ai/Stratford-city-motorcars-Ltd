import { auth } from "@Stratford-city-motorcars-Ltd/auth";
import { env } from "@Stratford-city-motorcars-Ltd/env/server";
import { createMiddleware } from "hono/factory";

import { HttpError } from "../lib/http";
import type { AppEnv, StaffEnv } from "../types";

/** Reads the Better Auth session cookie into `c.var.user` / `c.var.session`. */
export const loadSession = createMiddleware<AppEnv>(async (c, next) => {
  const result = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set("user", result?.user ?? null);
  c.set("session", result?.session ?? null);
  await next();
});

/**
 * Staff-only routes. Every account is a dealership staff account (public
 * sign-up is disabled), so a valid session is the permission.
 */
export const requireStaff = createMiddleware<StaffEnv>(async (c, next) => {
  if (!c.get("user") || !c.get("session")) {
    throw new HttpError(401, "unauthenticated", "Please sign in to continue.");
  }
  await next();
});

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Cross-site request forgery guard for cookie-authenticated writes: a browser
 * always sends `Origin` on a cross-origin POST/PUT/PATCH/DELETE, so a write
 * from any origin other than the dashboard is refused. Requests without an
 * `Origin` (server-to-server calls, scripts) are unaffected.
 */
export const sameOriginWrites = createMiddleware<AppEnv>(async (c, next) => {
  if (!SAFE_METHODS.has(c.req.method)) {
    const origin = c.req.header("origin");
    if (origin && !env.CORS_ORIGIN.includes(origin)) {
      throw new HttpError(403, "forbidden_origin", "This request is not allowed from this site.");
    }
  }
  await next();
});
