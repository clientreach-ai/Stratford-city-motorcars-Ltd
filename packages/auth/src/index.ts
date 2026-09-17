import { getDb } from "@Stratford-city-motorcars-Ltd/db";
import * as schema from "@Stratford-city-motorcars-Ltd/db/schema/auth";
import { env } from "@Stratford-city-motorcars-Ltd/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

/**
 * Staff authentication for the dealership admin.
 *
 * Accounts are for dealership staff only, so public sign-up is off: the
 * `/api/auth/sign-up/email` endpoint refuses every request. Members join
 * through an invitation from the owner, and the first owner is created from the
 * command line (`pnpm --filter server staff:create`), which builds a separate
 * instance with `allowSignUp`.
 *
 * `role` and `status` are admin fields (packages/core/src/team.ts); they can
 * never be set through Better Auth's own endpoints.
 */
export function createAuth(options: { allowSignUp?: boolean } = {}) {
  const db = getDb(env.DATABASE_URL);
  const production = env.NODE_ENV === "production";

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: schema,
    }),
    trustedOrigins: env.CORS_ORIGIN,
    emailAndPassword: {
      enabled: true,
      disableSignUp: !options.allowSignUp,
      minPasswordLength: 12,
    },
    user: {
      additionalFields: {
        role: { type: "string", required: false, defaultValue: "staff", input: false },
        status: { type: "string", required: false, defaultValue: "active", input: false },
        lastActiveAt: { type: "date", required: false, input: false },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 30,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
      },
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    advanced: {
      // In production the admin and the API may be on different sites, so
      // the session cookie must be sent cross-site over HTTPS. Locally both run
      // on localhost (one site, different ports), where a plain lax cookie works.
      defaultCookieAttributes: {
        sameSite: production ? "none" : "lax",
        secure: production,
        httpOnly: true,
      },
    },
    plugins: [],
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type Session = Auth["$Infer"]["Session"];

export const auth = createAuth();
