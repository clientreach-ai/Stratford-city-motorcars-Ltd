import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

/** Build output and generated files, never linted in any workspace. */
export const ignores = globalIgnores([
  "**/dist/**",
  "**/.next/**",
  "**/.turbo/**",
  "**/out/**",
  "**/build/**",
  "**/coverage/**",
  "**/next-env.d.ts",
]);

/**
 * `no-unused-vars` as TypeScript's own `noUnusedLocals`/`noUnusedParameters`
 * treat it: a leading underscore marks a binding as deliberately unused, and
 * destructuring a property away to omit it from a rest object is not a
 * finding.
 */
export const unusedVars = {
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
        ignoreRestSiblings: true,
      },
    ],
  },
};

/**
 * Recommended JavaScript and TypeScript rules, for Node code: the API and the
 * shared packages.
 */
export default defineConfig([
  ignores,
  js.configs.recommended,
  tseslint.configs.recommended,
  unusedVars,
  {
    languageOptions: {
      globals: globals.node,
    },
  },
]);
