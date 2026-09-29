import { eq, getDb } from "@Stratford-city-motorcars-Ltd/db";
import * as schema from "@Stratford-city-motorcars-Ltd/db/schema/auth";
import { env } from "@Stratford-city-motorcars-Ltd/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

/**
 * Staff authentication for the dealership admin.
 *
 * Accounts are for dealership staff only, so public sign-up is off. The API
 * does not expose Better Auth's own endpoints at all: the admin signs in and
 * out through /api/admin/session, which calls `auth.api` directly. Members are
 * added by the owner, and the first owner is created from the command line
 * (`pnpm --filter server staff:create`), which builds a separate instance with
 * `allowSignUp`.
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
      // Better Auth's own rate limit and session records read the client
      // address from these. On Render, Cloudflare sets CF-Connecting-IP and
      // overwrites any value the client sends; X-Forwarded-For there carries
      // several hops, which Better Auth refuses, putting every caller in one
      // shared bucket.
      ipAddress: {
        ipAddressHeaders: process.env.RENDER ? ["cf-connecting-ip"] : ["x-forwarded-for"],
      },
      // In production the admin and the API may be on different sites, so
      // the session cookie must be sent cross-site over HTTPS. Locally both run
      // on localhost (one site, different ports), where a plain lax cookie works.
      defaultCookieAttributes: {
        sameSite: production ? "none" : "lax",
        secure: production,
        httpOnly: true,
      },
    },
    databaseHooks: {
      session: {
        create: {
          // Only an active member may hold a session, however it is created:
          // a deactivated or invited account is refused here even if its
          // password is right. A row not found yet (sign-up creating the user
          // in the same transaction) is left to the foreign key.
          before: async (created) => {
            const [member] = await db
              .select({ status: schema.user.status })
              .from(schema.user)
              .where(eq(schema.user.id, created.userId))
              .limit(1);
            if (member && member.status !== "active") return false;
          },
        },
      },
    },
    plugins: [],
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type Session = Auth["$Infer"]["Session"];

export const auth = createAuth();
