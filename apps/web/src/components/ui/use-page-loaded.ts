"use client";

import { useEffect, useState } from "react";

/**
 * True once the page has finished loading (the window `load` event).
 *
 * Photographs a visitor cannot see yet — the hero's later cars, a gallery's
 * other slides — wait for this, so on a slow connection the first photograph
 * (the LCP) has the bandwidth to itself instead of sharing it with pictures
 * that are only a swipe or a few seconds away.
 */
export function usePageLoaded(): boolean {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (document.readyState === "complete") {
      setLoaded(true);
      return;
    }
    const onLoad = () => setLoaded(true);
    window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return loaded;
}
