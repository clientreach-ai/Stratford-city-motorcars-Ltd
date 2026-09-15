/**
 * Creates a staff login for the dashboard. Public sign-up is disabled, so this
 * is how the first (and every) account is made.
 *
 *   pnpm --filter web create-owner --email you@example.com --name "Your Name"
 *
 * The password is read from OWNER_PASSWORD if set, otherwise asked for
 * interactively. It must be at least 12 characters. Needs DATABASE_URL,
 * BETTER_AUTH_SECRET and BETTER_AUTH_URL (Bun loads apps/web/.env).
 */
import { createOwnerAccount } from "@Stratford-city-motorcars-Ltd/auth";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index > -1 ? process.argv[index + 1] : undefined;
}

const email = arg("email");
const name = arg("name");
if (!email || !name) {
  console.error('Usage: pnpm --filter web create-owner --email you@example.com --name "Your Name"');
  process.exit(1);
}

const password = process.env.OWNER_PASSWORD ?? prompt("Password (at least 12 characters):") ?? "";

try {
  const account = await createOwnerAccount({ email, name, password });
  console.log(`Created dashboard login for ${account.email}.`);
  process.exit(0);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
