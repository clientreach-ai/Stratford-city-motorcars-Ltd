import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Admin environment. Everything here reaches the browser, so nothing secret
 * belongs in it — sessions are cookies set by the API.
 */
export const env = createEnv({
  client: {
    /**
     * Where the admin's data comes from. `mock` runs on in-browser sample data
     * and needs nothing else; `api` calls NEXT_PUBLIC_ADMIN_API_URL.
     */
    NEXT_PUBLIC_ADMIN_DATA: z.enum(["mock", "api"]).default("mock"),
    /** The admin API origin, e.g. https://api.stratfordcitymotorcars.com. Required for `api`. */
    NEXT_PUBLIC_ADMIN_API_URL: z.url().optional(),
    /** The public website, for "view on website" links and site-relative photographs. */
    NEXT_PUBLIC_SITE_URL: z.url().default("https://www.stratfordcitymotorcars.com"),
  },
  runtimeEnv: {
    NEXT_PUBLIC_ADMIN_DATA: process.env.NEXT_PUBLIC_ADMIN_DATA,
    NEXT_PUBLIC_ADMIN_API_URL: process.env.NEXT_PUBLIC_ADMIN_API_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
  emptyStringAsUndefined: true,
  /**
   * Sample data must never ship. `mock` is the default so the admin runs with
   * no configuration at all, which makes a forgotten setting in production
   * silently serve invented cars and customers to the dealership — so a
   * production build refuses it, and `api` without an API origin cannot work.
   */
  createFinalSchema: (shape) =>
    z.object(shape).superRefine((value, context) => {
      const production = process.env.NODE_ENV === "production";
      if (production && value.NEXT_PUBLIC_ADMIN_DATA !== "api") {
        context.addIssue({
          code: "custom",
          path: ["NEXT_PUBLIC_ADMIN_DATA"],
          message: "Set NEXT_PUBLIC_ADMIN_DATA=api for production: sample data must never be served to the dealership.",
        });
      }
      if (value.NEXT_PUBLIC_ADMIN_DATA === "api" && !value.NEXT_PUBLIC_ADMIN_API_URL) {
        context.addIssue({
          code: "custom",
          path: ["NEXT_PUBLIC_ADMIN_API_URL"],
          message: "NEXT_PUBLIC_ADMIN_API_URL is required when NEXT_PUBLIC_ADMIN_DATA=api.",
        });
      }
    }),
});
