import { defineConfig } from "eslint/config";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";

import base from "./base.mjs";

/**
 * The base rules plus the Rules of Hooks and the React Compiler rules, for
 * React code outside a Next.js app (the shared UI package).
 */
export default defineConfig([
  base,
  reactHooks.configs.flat.recommended,
  {
    languageOptions: {
      globals: globals.browser,
    },
  },
]);
