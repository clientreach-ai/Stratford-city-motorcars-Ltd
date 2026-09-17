import { sql } from "@Stratford-city-motorcars-Ltd/db";
import { Hono } from "hono";

import { db } from "../../lib/db";
import { errorBody, ok } from "../../lib/http";
import type { AppEnv } from "../../types";
import { getMediaStorage } from "../media/storage";

/**
 *   GET /health   liveness + database reachability, for uptime checks.
 */
export const healthRoutes = new Hono<AppEnv>().get("/", async (c) => {
  c.header("Cache-Control", "no-store");
  try {
    await db.execute(sql`select 1`);
  } catch (error) {
    console.error("[health] database unreachable:", error instanceof Error ? error.message : error);
    return c.json(errorBody("database_unavailable", "The database is unreachable."), 503);
  }
  return ok(c, { status: "ok", database: "up", uploads: getMediaStorage() ? "configured" : "off" });
});
