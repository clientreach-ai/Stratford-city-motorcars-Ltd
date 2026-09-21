/**
 * Client state for the admin.
 *
 * The split that matters: anything the API owns — cars, enquiries, customers,
 * the team — is server state and lives in TanStack Query (`lib/query.ts`),
 * which already handles caching, refetching and invalidation. Copying it into
 * a store here would give the same fact two homes and a way to disagree.
 *
 * These stores hold only what the browser owns:
 *   shell           the sidebar and the navigation drawer
 *   stock-filters   the stock list's search, make and sort controls
 *   session         where to send someone whose session has expired
 */
export { useShellStore, useShellHydration } from "./shell";
export { useStockFilters } from "./stock-filters";
export { useSessionStore, notifyUnauthorised } from "./session";
