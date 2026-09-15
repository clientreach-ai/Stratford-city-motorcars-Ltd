import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Browser-visible environment. Only public, non-secret values belong here.
 * NEXT_PUBLIC_SERVER_URL is kept for the optional Hono server; the web app's
 * own dashboard and authentication no longer depend on it.
 */
export const env = createEnv({
  client: {
    NEXT_PUBLIC_SERVER_URL: z.url().optional(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL,
  },
  emptyStringAsUndefined: true,
});
