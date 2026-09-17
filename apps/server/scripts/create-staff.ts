/**
 * Creates an admin account from the command line — used for the first owner.
 * After that, the owner invites everyone else from the admin's Team page.
 *
 *   pnpm --filter server staff:create -- --email owner@example.com --name "Owner" --role owner
 *
 * `--role` is `owner` or `staff` (default `owner`).
 * The password is read from STAFF_PASSWORD, or prompted for, so it never lands
 * in shell history. At least 12 characters.
 */
import { parseArgs } from "node:util";

import { createAuth } from "@Stratford-city-motorcars-Ltd/auth";
import { eq, getDb, tables } from "@Stratford-city-motorcars-Ltd/db";
import { env } from "@Stratford-city-motorcars-Ltd/env/server";

const { values } = parseArgs({
  args: process.argv.slice(2).filter((arg) => arg !== "--"),
  options: {
    email: { type: "string" },
    name: { type: "string" },
    role: { type: "string", default: "owner" },
  },
});

const email = values.email?.trim().toLowerCase();
const name = values.name?.trim();
const role = values.role;
if (!email || !name || (role !== "owner" && role !== "staff")) {
  console.error('Usage: pnpm --filter server staff:create -- --email <email> --name "<name>" [--role owner|staff]');
  process.exit(1);
}

const password = process.env.STAFF_PASSWORD ?? prompt("Password (min 12 characters):")?.trim();
if (!password || password.length < 12) {
  console.error("A password of at least 12 characters is required.");
  process.exit(1);
}

const auth = createAuth({ allowSignUp: true });

try {
  const result = await auth.api.signUpEmail({ body: { email, name, password } });
  await getDb(env.DATABASE_URL)
    .update(tables.user)
    .set({ role, status: "active", emailVerified: true })
    .where(eq(tables.user.id, result.user.id));
  console.log(`Created ${role} account ${result.user.email} (${result.user.id}).`);
  process.exit(0);
} catch (error) {
  console.error(`Could not create the account: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
