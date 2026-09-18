import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "./src/index.ts",
  format: "esm",
  outDir: "./dist",
  clean: true,
  // This is a deployable application, not a library: nothing imports its types,
  // so declaration output is off. Generating it also fails, because the dts
  // pass cannot follow the type-only `Session` re-export out of the auth
  // package. Type safety is still enforced by `pnpm --filter server check-types`.
  dts: false,
  deps: {
    alwaysBundle: [/@Stratford-city-motorcars-Ltd\/.*/],
  },
});
