import { env } from "@Stratford-city-motorcars-Ltd/env/server";

import { createApp } from "./app";
import { getMediaStorage } from "./modules/media/storage";

const app = createApp();

// Report the upload configuration once at start-up rather than on first use.
getMediaStorage();

export type { AppType } from "./app";

export default {
  port: env.PORT,
  fetch: app.fetch,
};
