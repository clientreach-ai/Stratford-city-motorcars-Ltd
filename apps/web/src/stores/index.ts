/**
 * Client state for the website.
 *
 * The site is rendered on the server and almost all of it is server state:
 * stock comes from the database through `lib/inventory/repository.ts`, filters
 * and sorting live in the URL so a search can be shared and linked to, and the
 * enquiry forms use server actions. None of that belongs in a store.
 *
 * These stores hold the handful of things only the browser knows:
 *   nav       the mobile navigation drawer
 *   gallery   the vehicle gallery's photograph and full-screen viewer
 */
export { useNavStore } from "./nav";
export { useGalleryStore } from "./gallery";
