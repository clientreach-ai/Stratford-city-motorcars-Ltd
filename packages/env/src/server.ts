import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const optionalUrl = z.url().optional();
const optionalText = z.string().trim().min(1).optional();

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    /** Browser origins allowed to call the API with credentials. Comma-separated. */
    CORS_ORIGIN: z
      .string()
      .min(1)
      .transform((value) => value.split(",").map((origin) => origin.trim()).filter(Boolean))
      .pipe(z.array(z.url()).min(1)),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),

    // ---- Media uploads: S3-compatible object storage (Cloudflare R2) --------
    // Uploads are switched off unless the bucket and both keys are set.
    UPLOAD_BUCKET: optionalText,
    UPLOAD_REGION: z.string().trim().min(1).default("auto"),
    UPLOAD_ACCESS_KEY_ID: optionalText,
    UPLOAD_SECRET_ACCESS_KEY: optionalText,
    /**
     * S3 API endpoint, e.g. https://<account-id>.r2.cloudflarestorage.com.
     * When unset it is taken from UPLOAD_PUBLIC_BASE_URL if that points at the
     * R2 API host.
     */
    UPLOAD_ENDPOINT: optionalUrl,
    /**
     * Where browsers load uploaded files from: the bucket's r2.dev URL or a
     * custom domain. When it is the private R2 API host (or unset), photos are
     * recorded as site paths (`/media/…`) and served through this API instead.
     */
    UPLOAD_PUBLIC_BASE_URL: optionalUrl,

    // ---- Admin ----------------------------------------------------------------
    /** Where the admin app runs; invitation links point here. */
    ADMIN_URL: z.url().default("http://localhost:3002"),
    /** Invitation emails are sent through Resend when both are set. */
    RESEND_API_KEY: optionalText,
    /** e.g. "Stratford City Motorcars <admin@stratfordcitymotorcars.com>" */
    EMAIL_FROM: optionalText,

    // ---- Enquiry notifications ---------------------------------------------
    LEADS_WEBHOOK_URL: optionalUrl,
    LEADS_WEBHOOK_TOKEN: optionalText,

    // ---- Website cache refresh ---------------------------------------------
    /** The web app's revalidation endpoint, e.g. http://localhost:3001/api/revalidate. */
    WEB_REVALIDATE_URL: optionalUrl,
    REVALIDATE_SECRET: z.string().min(24).optional(),
  },
  runtimeEnv: process.env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
