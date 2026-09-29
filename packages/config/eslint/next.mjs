import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

import { ignores, unusedVars } from "./base.mjs";

/**
 * Next.js's own configuration (React, the Rules of Hooks with the React
 * Compiler rules, accessibility, imports and Core Web Vitals) with the
 * recommended TypeScript rules, for the website and the admin.
 */
export default defineConfig([
  ignores,
  js.configs.recommended,
  nextVitals,
  nextTs,
  unusedVars,
]);
