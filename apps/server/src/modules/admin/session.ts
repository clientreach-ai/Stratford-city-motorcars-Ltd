import { auth } from "@Stratford-city-motorcars-Ltd/auth";
import { eq, tables } from "@Stratford-city-motorcars-Ltd/db";
import { UnauthorisedError, ValidationError } from "@Stratford-city-motorcars-Ltd/core/errors";
import type { SessionUser } from "@Stratford-city-motorcars-Ltd/core/team";
import { Hono, type Context } from "hono";
import { z } from "zod";

import { db } from "../../lib/db";
import { HttpError } from "../../lib/http";
import { createRateLimiter } from "../../lib/rate-limit";
import { validate } from "../../lib/validation";
import type { AppEnv } from "../../types";
import { toRole } from "./context";

/**
 *   GET    /api/admin/session   the signed-in member (401 when signed out)
 *   POST   /api/admin/session   { email, password } → SessionUser, sets the cookie
 *   DELETE /api/admin/session   signs out (204)
 *
 * Sign-in goes through Better Auth, which sets the session cookie; this layer
 * adds the admin's rules: only `active` members may sign in, and every failure
 * gets the same message so an address cannot be probed.
 */

const WRONG_CREDENTIALS = "That email address and password do not match an account.";

const throttle = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: "Too many sign-in attempts. Wait a few minutes and try again.",
});

const signInBody = z.object({
  email: z.string().trim().toLowerCase().min(1, "Enter your email address.").max(160),
  password: z.string().min(1, "Enter your password.").max(200),
});

/** Copies Better Auth's Set-Cookie headers onto our response. */
function forwardCookies(c: Context, response: Response) {
  for (const cookie of response.headers.getSetCookie()) c.header("Set-Cookie", cookie, { append: true });
}

export const sessionRoutes = new Hono<AppEnv>()
  .get("/", (c) => {
    const user = c.get("user") as (NonNullable<AppEnv["Variables"]["user"]> & { role?: unknown; status?: unknown }) | null;
    if (!user || user.status !== "active") throw new UnauthorisedError();
    c.header("Cache-Control", "no-store");
    return c.json({ id: user.id, name: user.name, email: user.email, role: toRole(user.role) } satisfies SessionUser);
  })

  .post("/", validate("json", signInBody), async (c) => {
    throttle(c);
    const { email, password } = c.req.valid("json");

    const [member] = await db.select().from(tables.user).where(eq(tables.user.email, email)).limit(1);
    if (!member || member.status !== "active") throw new ValidationError({}, WRONG_CREDENTIALS);

    const response = await auth.api.signInEmail({
      body: { email, password, rememberMe: true },
      headers: c.req.raw.headers,
      asResponse: true,
    });
    if (response.status === 429) {
      throw new HttpError(429, "rate_limited", "Too many sign-in attempts. Wait a minute and try again.");
    }
    if (!response.ok) throw new ValidationError({}, WRONG_CREDENTIALS);

    forwardCookies(c, response);
    // A successful sign-in clears the count: only failures are throttled.
    throttle.reset(c);
    await db.update(tables.user).set({ lastActiveAt: new Date() }).where(eq(tables.user.id, member.id));
    return c.json({ id: member.id, name: member.name, email: member.email, role: toRole(member.role) } satisfies SessionUser);
  })

  .delete("/", async (c) => {
    if (c.get("session")) {
      const response = await auth.api.signOut({ headers: c.req.raw.headers, asResponse: true });
      forwardCookies(c, response);
    }
    return c.body(null, 204);
  });
