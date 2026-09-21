"use client";

import { create } from "zustand";

/**
 * What the app does when the API says the session has ended.
 *
 * Any query or mutation can be the one that discovers an expired session, so
 * `SessionGate` registers the handler once and the query client reads it from
 * outside React. A store rather than a module-level variable, so this follows
 * the same rules as the rest of the app's state and can be inspected in
 * devtools like everything else.
 */

type SessionState = {
  onUnauthorised: (() => void) | null;
  setUnauthorisedHandler: (handler: (() => void) | null) => void;
};

export const useSessionStore = create<SessionState>()((set) => ({
  onUnauthorised: null,
  setUnauthorisedHandler: (onUnauthorised) => set({ onUnauthorised }),
}));

/** Called from the query client, which is not a component and has no hooks. */
export function notifyUnauthorised(): void {
  useSessionStore.getState().onUnauthorised?.();
}
