import { getDb } from "@Stratford-city-motorcars-Ltd/db";
import * as schema from "@Stratford-city-motorcars-Ltd/db/schema/auth";
import { env } from "@Stratford-city-motorcars-Ltd/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

/**
 * Staff authentication for the dealership dashboard.
 *
 * Public sign-up is disabled: the dashboard edits live stock, so accounts are
 * created deliberately with `pnpm --filter web create-owner`, never by anyone
 * who finds the login page.
 */
export function createAuth() {
  const db = getDb(env.DATABASE_URL);
  const baseOrigin = new URL(env.BETTER_AUTH_URL).origin;

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: schema,
    }),
    trustedOrigins: env.CORS_ORIGIN ? [baseOrigin, env.CORS_ORIGIN] : [baseOrigin],
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    session: {
      // A working day, refreshed while the dashboard is in use.
      expiresIn: 60 * 60 * 12,
      updateAge: 60 * 60,
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 20,
    },
    advanced: {
      // The dashboard is served from the same origin as the auth routes, so a
      // first-party, Lax cookie is all it needs. Secure whenever served over
      // HTTPS.
      defaultCookieAttributes: {
        sameSite: "lax",
        secure: baseOrigin.startsWith("https://"),
        httpOnly: true,
      },
    },
    plugins: [],
  });
}

export type Auth = ReturnType<typeof createAuth>;

let instance: Auth | undefined;

/** Created on first use, so importing this module never requires the environment. */
export function getAuth(): Auth {
  instance ??= createAuth();
  return instance;
}

/**
 * Creates a dashboard login deliberately, from the command line — the only way
 * an account can exist while public sign-up is disabled. Mirrors what
 * better-auth's own email sign-up stores (a user plus a credential account with
 * a hashed password).
 */
export async function createOwnerAccount(input: { email: string; name: string; password: string }) {
  const auth = getAuth();
  const context = await auth.$context;
  const email = input.email.trim().toLowerCase();

  if (input.password.length < 12) throw new Error("Use a password of at least 12 characters.");
  if (await context.internalAdapter.findUserByEmail(email)) {
    throw new Error(`An account for ${email} already exists.`);
  }

  const { createLocalAccountIssuer } = await import("better-auth/db");
  const user = await context.internalAdapter.createUser(
    { email, name: input.name.trim(), emailVerified: true },
    { method: "email-password" },
  );
  await context.internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    issuer: createLocalAccountIssuer("credential"),
    accountId: user.id,
    password: await context.password.hash(input.password),
  });
  return { id: user.id, email };
}
