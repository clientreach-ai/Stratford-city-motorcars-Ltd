import { serve } from "@hono/node-server";
import { closeDb, describeError } from "@Stratford-city-motorcars-Ltd/db";
import { env } from "@Stratford-city-motorcars-Ltd/env/server";

import { createApp } from "./app";
import { getMediaStorage } from "./modules/media/storage";

const app = createApp();

// Report the upload configuration once at start-up rather than on first use.
getMediaStorage();

export type { AppType } from "./app";

// Bound on 0.0.0.0 so container hosts (Render, Fly, Docker) can reach it.
const server = serve({ fetch: app.fetch, port: env.PORT, hostname: "0.0.0.0" }, ({ port }) => {
  console.info(`[server] listening on http://0.0.0.0:${port}`);
});

/**
 * Render sends SIGTERM on every deploy and waits 30 seconds before killing the
 * process. New connections are refused at once; requests already running (a
 * save, a photograph being processed) are allowed to finish, then the database
 * pool is closed. Anything still running after 25 seconds is cut off.
 */
const SHUTDOWN_GRACE_MS = 25_000;
let stopping = false;

function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  console.info(`[server] ${signal} received; finishing requests in progress`);

  setTimeout(() => {
    console.error("[server] requests still running at the shutdown deadline; exiting");
    process.exit(1);
  }, SHUTDOWN_GRACE_MS).unref();

  server.close(async () => {
    try {
      await closeDb();
    } catch (error) {
      console.error(`[server] database pool did not close cleanly: ${describeError(error)}`);
    }
    console.info("[server] stopped");
    process.exit(0);
  });
}

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));
