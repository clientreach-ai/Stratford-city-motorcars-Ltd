"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * The admin shell: the collapsible sidebar and the mobile navigation drawer.
 *
 * Only the collapsed preference is remembered per browser — the drawer is
 * always closed on a fresh load, and `partialize` keeps it out of storage so a
 * reload can never restore a half-open navigation over the page.
 *
 * Rehydration is deferred (`skipHydration`) and run by `useShellHydration()`
 * after mount. The server has no localStorage, so reading it during the first
 * render would make the client's markup disagree with the server's and React
 * would discard the tree.
 */

type ShellState = {
  sidebarCollapsed: boolean;
  drawerOpen: boolean;
  toggleSidebar: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
};

export const useShellStore = create<ShellState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      drawerOpen: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
    }),
    {
      name: "scm-admin:shell",
      // Storage can be blocked entirely (private windows, locked-down browsers).
      // createJSONStorage returns undefined when it throws, and persist then
      // becomes a no-op rather than taking the shell down with it.
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
      skipHydration: true,
    },
  ),
);

/** Applies the remembered sidebar preference once the browser is running. */
export function useShellHydration(): void {
  useEffect(() => {
    void useShellStore.persist.rehydrate();
  }, []);
}
