"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("load", onChange, { once: true });
  return () => window.removeEventListener("load", onChange);
}

const isLoaded = () => document.readyState === "complete";

// The server never has a loaded page, so hydration always starts from false.
const isLoadedOnServer = () => false;

/**
 * True once the page has finished loading (the window `load` event).
 *
 * Photographs a visitor cannot see yet — the hero's later cars, a gallery's
 * other slides — wait for this, so on a slow connection the first photograph
 * (the LCP) has the bandwidth to itself instead of sharing it with pictures
 * that are only a swipe or a few seconds away.
 */
export function usePageLoaded(): boolean {
  return useSyncExternalStore(subscribe, isLoaded, isLoadedOnServer);
}
