"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import type { Route } from "next";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label, Select } from "@/components/ui/field";
import { formatNumber, formatPrice } from "@/lib/format";
import type { VehicleFacets } from "@/lib/inventory/types";

/**
 * Stock filters.
 *
 * All state lives in the URL, so a filtered view is shareable, bookmarkable,
 * survives a refresh and gives the back button something sensible to do.
 *
 * Exported as two pieces that share one set of controls: a persistent rail on
 * desktop, and a trigger plus bottom sheet on mobile. Splitting them lets the
 * page place each where it belongs without either being rendered twice.
 */
export function VehicleFilterRail({
  facets,
  activeCount,
}: {
  facets: VehicleFacets;
  activeCount: number;
}) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-28 max-h-[calc(100dvh-9rem)] overflow-y-auto pr-2">
        <FilterControls facets={facets} activeCount={activeCount} idPrefix="rail" />
      </div>
    </aside>
  );
}

export function VehicleFilterSheet({
  facets,
  resultCount,
  activeCount,
}: {
  facets: VehicleFacets;
  resultCount: number;
  activeCount: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Sits in the results bar rather than hidden behind a menu. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 items-center gap-2.5 border border-[var(--border-strong)] px-4 text-xs uppercase tracking-[0.14em] transition-colors hover:border-[var(--primary)] lg:hidden"
        aria-expanded={open}
        aria-controls="filter-sheet"
      >
        <SlidersHorizontal className="size-4" />
        Filter
        {activeCount > 0 ? (
          <span
            data-numeric
            className="flex size-5 items-center justify-center bg-[var(--primary)] text-[0.625rem] text-[var(--primary-foreground)]"
          >
            {activeCount}
          </span>
        ) : null}
      </button>

      <MobileSheet
        open={open}
        onClose={() => setOpen(false)}
        resultCount={resultCount}
      >
        <FilterControls facets={facets} activeCount={activeCount} idPrefix="sheet" />
      </MobileSheet>
    </>
  );
}

/** Reads and writes the URL. Every control below goes through this. */
function useFilterParams() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const commit = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const search = params.toString();
      startTransition(() => {
        // scroll:false keeps the customer's place in a long results list.
        router.push((search ? `/vehicles?${search}` : "/vehicles") as Route, {
          scroll: false,
        });
      });
    },
    [router, searchParams],
  );

  const toggle = useCallback(
    (key: string, value: string) => {
      commit((params) => {
        const current = params.getAll(key);
        params.delete(key);
        const next = current.includes(value)
          ? current.filter((entry) => entry !== value)
          : [...current, value];
        for (const entry of next) params.append(key, entry);
      });
    },
    [commit],
  );

  const set = useCallback(
    (key: string, value: string) => {
      commit((params) => {
        if (value) params.set(key, value);
        else params.delete(key);
      });
    },
    [commit],
  );

  const clear = useCallback(() => {
    commit((params) => {
      const sort = params.get("sort");
      for (const key of [...params.keys()]) params.delete(key);
      if (sort) params.set("sort", sort);
    });
  }, [commit]);

  return { searchParams, toggle, set, clear, isPending };
}

function FilterControls({
  facets,
  activeCount,
  idPrefix,
}: {
  facets: VehicleFacets;
  activeCount: number;
  /**
   * The rail and the sheet both mount, one hidden per breakpoint, so control
   * ids must be namespaced or the document ends up with duplicates and the
   * labels stop resolving for assistive technology.
   */
  idPrefix: string;
}) {
  const { searchParams, toggle, set, clear, isPending } = useFilterParams();
  const [term, setTerm] = useState(searchParams.get("q") ?? "");
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Keep the box in step when the URL changes from elsewhere (chips, clear).
  useEffect(() => {
    setTerm(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => () => clearTimeout(debounce.current), []);

  const onSearchChange = (value: string) => {
    setTerm(value);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => set("q", value), 350);
  };

  const priceBands = buildBands(facets.priceRange, 4);
  const mileageBands = buildBands(facets.mileageRange, 4);

  return (
    <div
      className={cn("space-y-8 transition-opacity", isPending && "opacity-60")}
      aria-busy={isPending}
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-roman text-[0.625rem] uppercase tracking-[0.22em] text-[var(--rule)]">
          Refine
        </h2>
        {activeCount > 0 ? (
          <button
            type="button"
            onClick={clear}
            className="text-xs text-[var(--muted-foreground)] underline underline-offset-4 transition-colors hover:text-[var(--foreground)]"
          >
            Clear all
          </button>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-filter-q`}>Keyword</Label>
        <Input
          id={`${idPrefix}-filter-q`}
          type="search"
          value={term}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Try “convertible” or “AMG”"
          className="h-11"
        />
      </div>

      <FilterGroup title="Make">
        <CheckList
          idPrefix={idPrefix}
          name="make"
          options={facets.make}
          selected={searchParams.getAll("make")}
          onToggle={toggle}
        />
      </FilterGroup>

      {facets.model.length > 1 ? (
        <FilterGroup title="Model">
          <CheckList
            idPrefix={idPrefix}
            name="model"
            options={facets.model}
            selected={searchParams.getAll("model")}
            onToggle={toggle}
          />
        </FilterGroup>
      ) : null}

      <FilterGroup title="Price">
        <div className="grid grid-cols-2 gap-2">
          <Select
            aria-label="Minimum price"
            value={searchParams.get("minPrice") ?? ""}
            onChange={(event) => set("minPrice", event.target.value)}
            className="h-11 text-sm"
          >
            <option value="">No min</option>
            {priceBands.map((band) => (
              <option key={band} value={band}>
                {formatPrice(band)}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Maximum price"
            value={searchParams.get("maxPrice") ?? ""}
            onChange={(event) => set("maxPrice", event.target.value)}
            className="h-11 text-sm"
          >
            <option value="">No max</option>
            {priceBands.map((band) => (
              <option key={band} value={band}>
                {formatPrice(band)}
              </option>
            ))}
          </Select>
        </div>
      </FilterGroup>

      <FilterGroup title="Maximum mileage">
        <Select
          aria-label="Maximum mileage"
          value={searchParams.get("maxMileage") ?? ""}
          onChange={(event) => set("maxMileage", event.target.value)}
          className="h-11 text-sm"
        >
          <option value="">Any mileage</option>
          {mileageBands.map((band) => (
            <option key={band} value={band}>
              Under {formatNumber(band)} miles
            </option>
          ))}
        </Select>
      </FilterGroup>

      <FilterGroup title="Year">
        <div className="grid grid-cols-2 gap-2">
          <Select
            aria-label="Earliest year"
            value={searchParams.get("minYear") ?? ""}
            onChange={(event) => set("minYear", event.target.value)}
            className="h-11 text-sm"
          >
            <option value="">From</option>
            {yearOptions(facets.yearRange).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Latest year"
            value={searchParams.get("maxYear") ?? ""}
            onChange={(event) => set("maxYear", event.target.value)}
            className="h-11 text-sm"
          >
            <option value="">To</option>
            {yearOptions(facets.yearRange).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>
        </div>
      </FilterGroup>

      <FilterGroup title="Body type">
        <CheckList
          idPrefix={idPrefix}
          name="bodyType"
          options={facets.bodyType}
          selected={searchParams.getAll("bodyType")}
          onToggle={toggle}
        />
      </FilterGroup>

      <FilterGroup title="Fuel">
        <CheckList
          idPrefix={idPrefix}
          name="fuel"
          options={facets.fuel}
          selected={searchParams.getAll("fuel")}
          onToggle={toggle}
        />
      </FilterGroup>

      <FilterGroup title="Gearbox">
        <CheckList
          idPrefix={idPrefix}
          name="transmission"
          options={facets.transmission}
          selected={searchParams.getAll("transmission")}
          onToggle={toggle}
        />
      </FilterGroup>

      {facets.features.length ? (
        <FilterGroup title="Features">
          <CheckList
            idPrefix={idPrefix}
            name="features"
            options={facets.features}
            selected={searchParams.getAll("features")}
            onToggle={toggle}
          />
        </FilterGroup>
      ) : null}
    </div>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="border-t border-[var(--border)] pt-6">
      <legend className="sr-only">{title}</legend>
      <p
        aria-hidden
        className="mb-3.5 text-[0.6875rem] uppercase tracking-[0.14em] text-[var(--muted-foreground)]"
      >
        {title}
      </p>
      {children}
    </fieldset>
  );
}

function CheckList({
  idPrefix,
  name,
  options,
  selected,
  onToggle,
}: {
  idPrefix: string;
  name: string;
  options: { value: string; label: string; count: number }[];
  selected: string[];
  onToggle: (name: string, value: string) => void;
}) {
  return (
    <ul className="space-y-2.5">
      {options.map((option) => {
        const id = `${idPrefix}-${name}-${option.value.replace(/\W+/g, "-")}`;
        const checked = selected.includes(option.value);
        return (
          <li key={option.value}>
            <label
              htmlFor={id}
              className="group flex cursor-pointer items-center gap-3 text-sm"
            >
              <Checkbox
                id={id}
                checked={checked}
                onChange={() => onToggle(name, option.value)}
              />
              <span className="flex-1 transition-colors group-hover:text-[var(--rule)]">
                {option.label}
              </span>
              <span
                data-numeric
                className="text-xs tabular-nums text-[var(--muted-foreground)]"
              >
                {option.count}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

/** Bottom sheet on mobile. Scrolls internally with the action bar pinned. */
function MobileSheet({
  open,
  onClose,
  resultCount,
  children,
}: {
  open: boolean;
  onClose: () => void;
  resultCount: number;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  return (
    <div
      id="filter-sheet"
      aria-hidden={!open}
      // See the note on the mobile nav: `inert` applies synchronously, so the
      // closed sheet is never a tab stop and the open one is focusable at once.
      inert={!open}
      className={cn(
        "fixed inset-0 z-60 lg:hidden",
        open ? "" : "pointer-events-none",
      )}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close filters"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-ink-950/55 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
      />

      <div
        role="dialog"
        aria-modal={open || undefined}
        aria-label="Filter stock"
        className={cn(
          "absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col bg-[var(--background)]",
          "transition-transform duration-300 ease-[var(--ease-out-expo)]",
          open ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <h2 className="font-display text-xl">Filter stock</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="flex size-10 items-center justify-center border border-[var(--border-strong)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)]"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6">{children}</div>

        <div className="shrink-0 border-t border-[var(--border)] p-4">
          <Button type="button" onClick={onClose} size="lg" className="w-full">
            Show {resultCount} {resultCount === 1 ? "vehicle" : "vehicles"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Round bands derived from the real min/max so options always make sense. */
function buildBands(range: { min: number; max: number }, count: number): number[] {
  const step = (range.max - range.min) / count;
  if (!Number.isFinite(step) || step <= 0) return [range.max];

  const magnitude = 10 ** Math.floor(Math.log10(step));
  const rounded = Math.max(Math.ceil(step / magnitude) * magnitude, 1);

  const bands: number[] = [];
  for (let value = rounded; value < range.max + rounded; value += rounded) {
    bands.push(Math.round(value));
  }
  return bands.slice(0, 8);
}

function yearOptions(range: { min: number; max: number }): number[] {
  const years: number[] = [];
  for (let year = range.max; year >= range.min; year -= 1) years.push(year);
  return years;
}
