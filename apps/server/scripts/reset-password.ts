/**
 * Sets a new password for an existing admin account from the command line.
 *
 *   pnpm --filter server staff:password -- --email owner@example.com
 *
 * The admin's own "forgotten your password" route asks the owner to set a new
 * one from the Team page, which is no help when it is the owner who is locked
 * out. This is the way back in.
 *
 * The password is read from STAFF_PASSWORD, or prompted for, so it never lands
 * in shell history. At least 12 characters.
 *
 * `--activate` also returns a `deactivated` or `invited` member to `active`;
 * without it the member's status is left exactly as it is.
 */
import { parseArgs } from "node:util";

import { auth } from "@Stratford-city-motorcars-Ltd/auth";
import { eq, getDb, tables } from "@Stratford-city-motorcars-Ltd/db";
import { env } from "@Stratford-city-motorcars-Ltd/env/server";

const { values } = parseArgs({
  args: process.argv.slice(2).filter((arg) => arg !== "--"),
  options: {
    email: { type: "string" },
    activate: { type: "boolean", default: false },
  },
});

const email = values.email?.trim().toLowerCase();
if (!email) {
  console.error('Usage: pnpm --filter server staff:password -- --email <email> [--activate]');
  process.exit(1);
}

const password = process.env.STAFF_PASSWORD ?? prompt("New password (min 12 characters):")?.trim();
if (!password || password.length < 12) {
  console.error("A password of at least 12 characters is required.");
  process.exit(1);
}

const db = getDb(env.DATABASE_URL);

try {
  const [member] = await db.select().from(tables.user).where(eq(tables.user.email, email)).limit(1);
  if (!member) {
    console.error(`No account for ${email}. Create one with staff:create.`);
    process.exit(1);
  }

  // Better Auth owns the hashing and the `credential` account row; going
  // through its context keeps this identical to a password set in the app.
  const context = await auth.$context;
  await context.internalAdapter.updatePassword(member.id, await context.password.hash(password));

  if (values.activate && member.status !== "active") {
    await db.update(tables.user).set({ status: "active" }).where(eq(tables.user.id, member.id));
    console.log(`Returned ${email} to active.`);
  }

  console.log(`Password updated for ${email}.`);
  if (member.status !== "active" && !values.activate) {
    console.warn(`Note: this member is "${member.status}", so sign-in is still refused. Re-run with --activate.`);
  }
  process.exit(0);
} catch (error) {
  console.error(`Could not set the password: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
