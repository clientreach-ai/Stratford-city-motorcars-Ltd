"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { X } from "lucide-react";
import type { Route } from "next";

import { Select } from "@/components/ui/field";
import { formatNumber, formatPrice } from "@/lib/format";
import { SORT_OPTIONS } from "@/lib/inventory/types";

function useUpdateParams() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  return (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const search = params.toString();
    startTransition(() => {
      router.push((search ? `/vehicles?${search}` : "/vehicles") as Route, {
        scroll: false,
      });
    });
  };
}

export function VehicleSort() {
  const searchParams = useSearchParams();
  const update = useUpdateParams();

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3 sm:flex-none">
      <label
        htmlFor="sort"
        className="hidden shrink-0 text-[0.6875rem] uppercase tracking-[0.14em] text-[var(--muted-foreground)] sm:block"
      >
        Sort
      </label>
      <Select
        id="sort"
        // The visible label is hidden below sm, so the control carries its own
        // name rather than relying on a label that disappears on phones.
        aria-label="Sort vehicles"
        value={searchParams.get("sort") ?? "newest"}
        onChange={(event) =>
          update((params) => {
            if (event.target.value === "newest") params.delete("sort");
            else params.set("sort", event.target.value);
          })
        }
        /* A fixed min-width pushed the results bar past a 320px viewport.
           Take the space that is actually available, and only pin a width
           from sm upwards. */
        className="h-11 min-w-0 flex-1 truncate text-sm sm:min-w-45 sm:flex-none"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

const LABELS: Record<string, string> = {
  q: "Keyword",
  make: "Make",
  model: "Model",
  fuel: "Fuel",
  transmission: "Gearbox",
  bodyType: "Body",
  features: "Feature",
  minPrice: "From",
  maxPrice: "Up to",
  maxMileage: "Under",
  minYear: "From",
  maxYear: "To",
};

function formatChip(key: string, value: string): string {
  if (key === "minPrice" || key === "maxPrice") return formatPrice(Number(value));
  if (key === "maxMileage") return `${formatNumber(Number(value))} miles`;
  return value;
}

/**
 * Applied filters, each individually removable. On a phone this is the only
 * way to see what is filtering the list without reopening the sheet.
 */
export function ActiveFilterChips() {
  const searchParams = useSearchParams();
  const update = useUpdateParams();

  const chips: { key: string; value: string }[] = [];
  for (const [key, value] of searchParams.entries()) {
    if (key === "sort" || !value) continue;
    chips.push({ key, value });
  }

  if (chips.length === 0) return null;

  return (
    <ul className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <li key={`${chip.key}-${chip.value}`}>
          <button
            type="button"
            onClick={() =>
              update((params) => {
                const remaining = params
                  .getAll(chip.key)
                  .filter((entry) => entry !== chip.value);
                params.delete(chip.key);
                for (const entry of remaining) params.append(chip.key, entry);
              })
            }
            className="group flex items-center gap-2 border border-[var(--border-strong)] py-1.5 pl-3 pr-2.5 text-xs transition-colors hover:border-[var(--primary)]"
          >
            <span className="text-[var(--muted-foreground)]">
              {LABELS[chip.key] ?? chip.key}
            </span>
            <span>{formatChip(chip.key, chip.value)}</span>
            <X className="size-3.5 text-[var(--muted-foreground)] transition-colors group-hover:text-[var(--foreground)]" />
            <span className="sr-only">Remove filter</span>
          </button>
        </li>
      ))}
      <li>
        <button
          type="button"
          onClick={() =>
            update((params) => {
              const sort = params.get("sort");
              for (const key of [...params.keys()]) params.delete(key);
              if (sort) params.set("sort", sort);
            })
          }
          className="px-2 py-1.5 text-xs text-[var(--muted-foreground)] underline underline-offset-4 transition-colors hover:text-[var(--foreground)]"
        >
          Clear all
        </button>
      </li>
    </ul>
  );
}
