"use client";

import type { StockSort } from "@Stratford-city-motorcars-Ltd/core";
import { create } from "zustand";

/**
 * The stock list's own controls: free-text search, the make filter and the
 * sort order.
 *
 * Status is deliberately NOT here — it stays in the URL (`/stock?status=draft`)
 * so a tab can be linked to, shared and opened from the overview. These three
 * are working state: holding them here keeps a search alive while staff open a
 * car, edit it and come back, which is the whole shape of the job.
 *
 * Not persisted: a new browser session starts on the full list rather than on
 * a filter someone forgot they left on.
 */

type StockFiltersState = {
  search: string;
  make: string;
  sort: StockSort;
  setSearch: (search: string) => void;
  setMake: (make: string) => void;
  setSort: (sort: StockSort) => void;
  clear: () => void;
};

const EMPTY = { search: "", make: "all", sort: "updated" as StockSort };

export const useStockFilters = create<StockFiltersState>()((set) => ({
  ...EMPTY,
  setSearch: (search) => set({ search }),
  setMake: (make) => set({ make }),
  setSort: (sort) => set({ sort }),
  clear: () => set(EMPTY),
}));
