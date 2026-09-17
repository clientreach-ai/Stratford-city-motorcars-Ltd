import { auth } from "@Stratford-city-motorcars-Ltd/auth";
import { env } from "@Stratford-city-motorcars-Ltd/env/server";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";

import { errorBody, handleError, handleNotFound, ok } from "./lib/http";
import { loadSession, sameOriginWrites } from "./middleware/auth";
import { adminRoutes } from "./modules/admin";
import { healthRoutes } from "./modules/health/routes";
import { publicLeadRoutes } from "./modules/leads/public-routes";
import { mediaRoutes } from "./modules/media/routes";
import { MAX_PHOTO_BYTES } from "./modules/media/photos";
import { publicVehicleRoutes } from "./modules/vehicles/public-routes";
import type { AppEnv } from "./types";

/**
 * Stratford City Motorcars API.
 *
 *   /health               uptime check
 *   /media/*              stored photographs (when the bucket has no public URL)
 *   /api/auth/*           Better Auth (used by /api/admin/session)
 *   /api/vehicles/*       public stock
 *   /api/leads            public enquiry submission
 *   /api/admin/*          the admin API (docs/STRATFORD_ADMIN_CONTRACT.md)
 *
 * Error responses follow lib/http.ts.
 */
export function createApp() {
  const app = new Hono<AppEnv>();

  app.use(requestId());
  app.use(logger());
  app.use(secureHeaders({ crossOriginResourcePolicy: "cross-origin" }));
  app.use(
    "/api/*",
    cors({
      origin: env.CORS_ORIGIN,
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
      exposeHeaders: ["Location", "Retry-After", "X-Request-Id"],
      credentials: true,
      maxAge: 600,
    }),
  );
  const tooLarge = bodyLimit({
    maxSize: 1024 * 1024,
    onError: (c) => c.json(errorBody("payload_too_large", "The request body is too large."), 413),
  });
  const photoLimit = bodyLimit({
    // The photo plus multipart overhead.
    maxSize: MAX_PHOTO_BYTES + 1024 * 1024,
    onError: (c) => c.json(errorBody("payload_too_large", "This photograph is larger than 25 MB.", { fields: { file: "Photographs must be 25 MB or smaller." } }), 413),
  });
  app.use("/api/*", (c, next) =>
    c.req.method === "POST" && /^\/api\/admin\/vehicles\/[^/]+\/media$/.test(c.req.path) ? photoLimit(c, next) : tooLarge(c, next),
  );

  app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

  app.use("/api/*", sameOriginWrites, loadSession);

  const routes = app
    .get("/", (c) => ok(c, { name: "Stratford City Motorcars API" }))
    .route("/health", healthRoutes)
    .route("/media", mediaRoutes)
    .route("/api/vehicles", publicVehicleRoutes)
    .route("/api/leads", publicLeadRoutes)
    .route("/api/admin", adminRoutes);

  app.notFound(handleNotFound);
  app.onError(handleError);

  return routes;
}

export type AppType = ReturnType<typeof createApp>;
