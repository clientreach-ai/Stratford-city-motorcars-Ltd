import {
  featuredVehicles,
  findBySlug,
  makeModelIndex,
  relatedVehicles,
  resolveSlug,
  searchPublicVehicles,
} from "@Stratford-city-motorcars-Ltd/domain/inventory/search";
import type { SortOption } from "@Stratford-city-motorcars-Ltd/core/vehicle";
import { Hono } from "hono";

import { notFound, ok } from "../../lib/http";
import { validate } from "../../lib/validation";
import type { AppEnv } from "../../types";
import { limitQuery, publicSearchQuery, slugParam } from "./schemas";
import { loadPublicVehicles } from "./service";

/**
 * Public stock, for the website and anything else that lists the cars.
 * Only cars that pass the publishing rules are ever returned.
 *
 *   GET /api/vehicles                 cars for sale, filtered by make/model, sorted
 *   GET /api/vehicles/featured        hand-picked homepage cars
 *   GET /api/vehicles/makes           make → models index for the search
 *   GET /api/vehicles/:slug           one car (sold cars included); old slugs redirect
 *   GET /api/vehicles/:slug/related   similar cars for sale
 */
export const publicVehicleRoutes = new Hono<AppEnv>()
  .use(async (c, next) => {
    await next();
    if (c.res.status === 200) c.header("Cache-Control", "public, max-age=30, stale-while-revalidate=300");
  })

  .get("/", validate("query", publicSearchQuery), async (c) => {
    const query = c.req.valid("query");
    const { results, total, facets } = searchPublicVehicles(await loadPublicVehicles(), {
      ...query,
      sort: query.sort as SortOption | undefined,
    });
    return ok(c, results, 200, { count: results.length, total, facets });
  })

  .get("/featured", validate("query", limitQuery(4, 12)), async (c) => {
    return ok(c, featuredVehicles(await loadPublicVehicles(), c.req.valid("query").limit));
  })

  .get("/makes", async (c) => {
    return ok(c, makeModelIndex(await loadPublicVehicles()));
  })

  .get("/:slug", validate("param", slugParam), async (c) => {
    const { slug } = c.req.valid("param");
    const all = await loadPublicVehicles();
    const vehicle = findBySlug(all, slug);
    if (vehicle) return ok(c, vehicle);

    const current = resolveSlug(all, slug);
    if (current) {
      c.header("Location", `/api/vehicles/${current}`);
      return c.json({ data: null, meta: { redirectTo: current } }, 308);
    }
    throw notFound("Vehicle");
  })

  .get("/:slug/related", validate("param", slugParam), validate("query", limitQuery(3, 12)), async (c) => {
    const all = await loadPublicVehicles();
    return ok(c, relatedVehicles(all, c.req.valid("param").slug, c.req.valid("query").limit));
  });
