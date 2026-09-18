import { serve } from "@hono/node-server";
import { env } from "@Stratford-city-motorcars-Ltd/env/server";

import { createApp } from "./app";
import { getMediaStorage } from "./modules/media/storage";

const app = createApp();

// Report the upload configuration once at start-up rather than on first use.
getMediaStorage();

export type { AppType } from "./app";

// Bound on 0.0.0.0 so container hosts (Render, Fly, Docker) can reach it.
serve({ fetch: app.fetch, port: env.PORT, hostname: "0.0.0.0" }, ({ port }) => {
  console.info(`[server] listening on http://0.0.0.0:${port}`);
});
