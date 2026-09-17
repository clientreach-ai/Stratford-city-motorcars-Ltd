import { Hono } from "hono";

import type { AppEnv } from "../../types";
import { getMediaStorage } from "./storage";

/**
 *   GET /media/:vehicleId/:file   a stored photo, streamed from the bucket
 *
 * Used when the bucket has no public URL: photos are recorded as `/media/…`
 * and the website's `/media` route forwards here. File names are generated and
 * never reused, so responses are immutable.
 */
export const mediaRoutes = new Hono<AppEnv>().get("/:vehicleId/:file", async (c) => {
  const storage = getMediaStorage();
  const file = storage ? await storage.open(`${c.req.param("vehicleId")}/${c.req.param("file")}`) : null;
  if (!file) return c.body("Not found", 404);

  return c.body(file.body, 200, {
    "Content-Type": file.type || "application/octet-stream",
    "Content-Length": String(file.size),
    "Cache-Control": "public, max-age=31536000, immutable",
    ETag: file.etag,
    "X-Content-Type-Options": "nosniff",
  });
});
