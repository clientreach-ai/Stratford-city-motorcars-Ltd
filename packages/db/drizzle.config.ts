import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

// The web app hosts the dashboard and auth; the Hono server is optional.
dotenv.config({ path: "../../apps/web/.env" });
dotenv.config({ path: "../../apps/server/.env" });

export default defineConfig({
  schema: "./src/schema",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
});
