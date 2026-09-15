import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/**
 * Server environment for the staff dashboard, authentication and database.
 * Validated when first imported — only import this from code that needs it,
 * so the public site can build and run without a database.
 */
export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    /** The origin that serves /api/auth — the web app in this project. */
    BETTER_AUTH_URL: z.url(),
    /** Only needed if a separate origin (the Hono server) calls the auth API. */
    CORS_ORIGIN: z.url().optional(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  },
  runtimeEnv: process.env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
