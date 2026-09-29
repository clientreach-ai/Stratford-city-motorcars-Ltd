import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Whether this is the live website, as opposed to local development or a
 * Vercel preview.
 *
 * On Vercel, VERCEL_ENV says so directly. Previews also build and run with
 * NODE_ENV=production, so NODE_ENV alone would treat every branch preview as
 * the live site. Anywhere else (a self-hosted `next build` / `next start`),
 * NODE_ENV=production is the only signal there is.
 */
function isProductionDeployment(): boolean {
  const vercelEnv = process.env.VERCEL_ENV?.trim();
  if (vercelEnv) return vercelEnv === "production";
  return process.env.NODE_ENV === "production";
}

const MISSING_DATABASE_MESSAGE =
  "DATABASE_URL is required for the production website. Without it the site falls back to the seed records, which are all drafts, and shows no cars.";

/**
 * Website environment. Validated when next.config.ts loads, so a bad value
 * fails the build rather than a page, and again when the server first loads
 * it (the inventory store reads DATABASE_URL through here), in case the
 * deployment's runtime settings differ from its build's.
 */
export const env = createEnv({
  server: {
    /**
     * The same Postgres as the API server. Optional only for local development
     * and previews, which run on the read-only seed records.
     */
    DATABASE_URL: z.string().trim().min(1).optional(),
    /** Shared with the API server; switches /api/revalidate on when set. */
    REVALIDATE_SECRET: z.string().trim().min(24, "REVALIDATE_SECRET must be at least 24 characters.").optional(),
  },
  client: {
    /** Canonical origin. Defaults to https://www.stratfordcitymotorcars.com in site.ts. */
    NEXT_PUBLIC_SITE_URL: z.url().optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    REVALIDATE_SECRET: process.env.REVALIDATE_SECRET,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
  emptyStringAsUndefined: true,
  /**
   * The seed records are all drafts, so a live site without a database builds
   * and runs perfectly well while showing no cars at all — the failure nobody
   * notices until a customer does. A production deployment therefore refuses
   * to build without DATABASE_URL.
   *
   * Previews are deliberately exempt: requiring a database there would push
   * them onto the production one, where test enquiries would land in the
   * dealership's admin. A preview without one runs on the seed records and
   * says so in the build log.
   */
  createFinalSchema: (shape, isServer) =>
    z.object(shape).superRefine((value, context) => {
      // The browser never sees server variables, so there is nothing to check there.
      if (!isServer || (value as { DATABASE_URL?: string }).DATABASE_URL) return;
      if (isProductionDeployment()) {
        context.addIssue({ code: "custom", path: ["DATABASE_URL"], message: MISSING_DATABASE_MESSAGE });
      } else if (process.env.VERCEL_ENV === "preview") {
        console.warn("[env] DATABASE_URL is not set: this preview runs on the seed records and shows no cars.");
      }
    }),
});
