"use client";

import Form from "next/form";
import { useState } from "react";
import { Search } from "lucide-react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/field";

/**
 * The hero search. A GET form pointed at /vehicles, so it works with
 * JavaScript disabled and the resulting URL is shareable and indexable.
 *
 * `next/form` upgrades submission to a client-side navigation and prefetches
 * the stock page, so the result feels instant without us writing a router
 * call. The only state here is the make → model dependency.
 */
export function StockSearch({
  makeModels,
  priceBands,
  fuels,
  transmissions,
  className,
}: {
  makeModels: Record<string, string[]>;
  priceBands: { value: string; label: string }[];
  fuels: string[];
  transmissions: string[];
  className?: string;
}) {
  const [make, setMake] = useState("");
  const models = make ? (makeModels[make] ?? []) : [];

  return (
    <Form action="/vehicles" className={className}>
      <div className="grid grid-cols-2 gap-px bg-[var(--border)] lg:grid-cols-5">
        <SearchCell label="Make" htmlFor="search-make">
          <Select
            id="search-make"
            name="make"
            value={make}
            onChange={(event) => setMake(event.target.value)}
            className="h-12 truncate border-0 bg-transparent px-0 pr-8 text-[0.9375rem] focus-visible:outline-offset-4"
          >
            <option value="">Any make</option>
            {Object.keys(makeModels).sort().map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </SearchCell>

        <SearchCell label="Model" htmlFor="search-model">
          <Select
            id="search-model"
            name="model"
            disabled={models.length === 0}
            className="h-12 truncate border-0 bg-transparent px-0 pr-8 text-[0.9375rem] focus-visible:outline-offset-4"
          >
            <option value="">Any model</option>
            {models.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </SearchCell>

        <SearchCell label="Max price" htmlFor="search-price">
          <Select
            id="search-price"
            name="maxPrice"
            className="h-12 truncate border-0 bg-transparent px-0 pr-8 text-[0.9375rem] focus-visible:outline-offset-4"
          >
            <option value="">No maximum</option>
            {priceBands.map((band) => (
              <option key={band.value} value={band.value}>
                {band.label}
              </option>
            ))}
          </Select>
        </SearchCell>

        <SearchCell label="Fuel" htmlFor="search-fuel">
          <Select
            id="search-fuel"
            name="fuel"
            className="h-12 truncate border-0 bg-transparent px-0 pr-8 text-[0.9375rem] focus-visible:outline-offset-4"
          >
            <option value="">Any fuel</option>
            {fuels.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </SearchCell>

        <SearchCell label="Gearbox" htmlFor="search-transmission" className="col-span-2 lg:col-span-1">
          <Select
            id="search-transmission"
            name="transmission"
            className="h-12 truncate border-0 bg-transparent px-0 pr-8 text-[0.9375rem] focus-visible:outline-offset-4"
          >
            <option value="">Any gearbox</option>
            {transmissions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </SearchCell>
      </div>

      <Button type="submit" size="lg" variant="brass" className="mt-px w-full">
        <Search className="size-4" />
        Search stock
      </Button>
    </Form>
  );
}

function SearchCell({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  /** Must match the id of the control inside, or the select has no name. */
  htmlFor: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0 bg-[var(--background)] px-4 pb-1 pt-3.5", className)}>
      <Label htmlFor={htmlFor} className="mb-0.5">
        {label}
      </Label>
      {children}
    </div>
  );
}
