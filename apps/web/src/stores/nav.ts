"use client";

import { create } from "zustand";

/**
 * The mobile navigation drawer.
 *
 * The header button opens it and the drawer itself, the route change and the
 * Escape key all close it, so the flag is shared rather than owned by either
 * component.
 *
 * Nothing here is persisted or read on the server: the site is rendered on the
 * server and this is browser-only interface state.
 */

type NavState = {
  open: boolean;
  openNav: () => void;
  closeNav: () => void;
};

export const useNavStore = create<NavState>()((set) => ({
  open: false,
  openNav: () => set({ open: true }),
  closeNav: () => set({ open: false }),
}));
