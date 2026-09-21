"use client";

import { create } from "zustand";

/**
 * The vehicle gallery: which photograph is showing, and whether the
 * full-screen viewer is open.
 *
 * One car is on screen at a time, so one store serves the page. `reset()` is
 * called when the gallery mounts because a buyer who left car A on its sixth
 * photograph must not arrive at car B — which may have three — on an index
 * that does not exist.
 *
 * The scroll-snap track remains the source of truth for what the eye sees:
 * `active` follows it on swipe and drives it on arrow-key and thumbnail
 * presses, exactly as it did as local state.
 */

type GalleryState = {
  active: number;
  lightbox: boolean;
  setActive: (active: number) => void;
  openLightbox: () => void;
  closeLightbox: () => void;
  reset: () => void;
};

export const useGalleryStore = create<GalleryState>()((set) => ({
  active: 0,
  lightbox: false,
  setActive: (active) => set({ active }),
  openLightbox: () => set({ lightbox: true }),
  closeLightbox: () => set({ lightbox: false }),
  reset: () => set({ active: 0, lightbox: false }),
}));
