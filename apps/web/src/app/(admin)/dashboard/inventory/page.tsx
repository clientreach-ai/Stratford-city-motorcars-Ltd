import type { Metadata, Route } from "next";
import Link from "next/link";
import { ChevronDown, Plus, Search } from "lucide-react";

import { ConfirmButton } from "@/components/dashboard/confirm-button";
import { Notice, PageTitle, StatusBadge, Tag, Thumb } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { createVehicle, listAction } from "@/lib/dashboard/actions";
import { LISTING_PHOTO_TARGET, loadAllRecords, summarise, type VehicleSummary } from "@/lib/dashboard/inventory";
import { formatDate, formatVehiclePrice } from "@/lib/format";
import { VEHICLE_STATUSES, type VehicleStatus } from "@/lib/inventory/types";
import { requireStaff } from "@/lib/server/staff";

export const metadata: Metadata = { title: "Inventory" };

const TABS: { value: "all" | VehicleStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Drafts" },
  { value: "sold", label: "Sold" },
  { value: "archived", label: "Archived" },
];

const SORTS = {
  updated: { label: "Recently changed", compare: (a: VehicleSummary, b: VehicleSummary) => b.record.updatedAt.localeCompare(a.record.updatedAt) },
  "price-desc": { label: "Price: high to low", compare: (a: VehicleSummary, b: VehicleSummary) => (b.record.price ?? -1) - (a.record.price ?? -1) },
  "price-asc": { label: "Price: low to high", compare: (a: VehicleSummary, b: VehicleSummary) => (a.record.price ?? Infinity) - (b.record.price ?? Infinity) },
  name: { label: "Name", compare: (a: VehicleSummary, b: VehicleSummary) => a.name.localeCompare(b.name) },
} as const;

type SortKey = keyof typeof SORTS;

export default async function InventoryPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireStaff();
  const params = await props.searchParams;
  const first = (key: string) => (Array.isArray(params[key]) ? params[key]![0] : params[key]) ?? "";
  const q = first("q").trim().slice(0, 80);
  const status = (["all", ...VEHICLE_STATUSES] as string[]).includes(first("status")) ? (first("status") as "all" | VehicleStatus) : "all";
  const sort: SortKey = first("sort") in SORTS ? (first("sort") as SortKey) : "updated";
  const done = first("done").slice(0, 200);
  const error = first("error").slice(0, 200);

  const all = (await loadAllRecords()).map(summarise);
  const counts = Object.fromEntries(TABS.map((tab) => [tab.value, tab.value === "all" ? all.length : all.filter((car) => car.record.status === tab.value).length]));
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const cars = all
    .filter((car) => status === "all" || car.record.status === status)
    .filter((car) => {
      if (!words.length) return true;
      const haystack = [car.name, car.record.make, car.record.model, car.record.variant, car.record.registration, car.record.slug].join(" ").toLowerCase();
      return words.every((word) => haystack.includes(word));
    })
    .sort(SORTS[sort].compare);

  const href = (next: Record<string, string>) => {
    const search = new URLSearchParams({ ...(q ? { q } : {}), ...(status !== "all" ? { status } : {}), ...(sort !== "updated" ? { sort } : {}), ...next });
    for (const [key, value] of [...search.entries()]) if (!value || value === "all" || value === "updated") search.delete(key);
    const query = search.toString();
    return (query ? `/dashboard/inventory?${query}` : "/dashboard/inventory") as Route;
  };

  return (
    <>
      <PageTitle
        title="Inventory"
        description="Every car, whether it's on the website or not. A car only appears on the website once it's published and has everything a buyer needs."
        actions={
          <form action={createVehicle}>
            <Button type="submit" size="md">
              <Plus className="size-4" />
              Add a car
            </Button>
          </form>
        }
      />

      {done ? <Notice tone="success">{done}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Filter by status" className="-mx-1 flex flex-wrap gap-1">
          {TABS.map((tab) => (
            <Link
              key={tab.value}
              href={href({ status: tab.value })}
              aria-current={status === tab.value ? "page" : undefined}
              className={
                status === tab.value
                  ? "inline-flex min-h-11 items-center gap-2 border border-[var(--primary)] bg-[var(--primary)] px-3 text-sm text-[var(--primary-foreground)]"
                  : "inline-flex min-h-11 items-center gap-2 border border-[var(--border)] bg-[var(--background)] px-3 text-sm hover:border-[var(--border-strong)]"
              }
            >
              {tab.label}
              <span data-numeric className="text-xs opacity-70">
                {counts[tab.value]}
              </span>
            </Link>
          ))}
        </nav>

        <form className="flex flex-wrap gap-2" role="search">
          {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
          <label htmlFor="inventory-search" className="sr-only">
            Search inventory
          </label>
          <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <Input id="inventory-search" name="q" defaultValue={q} placeholder="Make, model or registration" className="h-11 pl-9 text-sm" />
          </div>
          <label htmlFor="inventory-sort" className="sr-only">
            Sort
          </label>
          <Select id="inventory-sort" name="sort" defaultValue={sort} className="h-11 w-44 text-sm">
            {Object.entries(SORTS).map(([value, option]) => (
              <option key={value} value={value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Button type="submit" size="sm" variant="outline" className="h-11">
            Apply
          </Button>
        </form>
      </div>

      {cars.length === 0 ? (
        <div className="border border-dashed border-[var(--border-strong)] bg-[var(--background)] px-6 py-16 text-center">
          <p className="font-display text-xl">{all.length ? "No cars match" : "No cars yet"}</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted-foreground)]">
            {all.length
              ? "Try a different search or status."
              : "Add your first car. It starts as a draft, so nothing appears on the website until you publish it."}
          </p>
          {all.length ? (
            <Link href="/dashboard/inventory" className="mt-4 inline-block text-sm underline underline-offset-2">
              Clear filters
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border)] border border-[var(--border)] bg-[var(--background)]">
          {cars.map((car) => (
            <VehicleRow key={car.record.id} car={car} />
          ))}
        </ul>
      )}
    </>
  );
}

function VehicleRow({ car }: { car: VehicleSummary }) {
  const { record } = car;
  const editHref = `/dashboard/inventory/${record.id}` as Route;

  return (
    <li className="grid grid-cols-[4.5rem_1fr] gap-4 p-4 md:grid-cols-[6rem_minmax(0,1fr)_9rem_8rem_auto] md:items-center">
      <Link href={editHref} tabIndex={-1} aria-hidden>
        <Thumb image={car.cover} />
      </Link>

      <div className="min-w-0">
        <Link href={editHref} className="block truncate font-medium underline-offset-2 hover:underline">
          {car.name}
        </Link>
        <p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">
          {[record.variant, record.registration, record.mileage !== null ? `${record.mileage.toLocaleString("en-GB")} miles` : null]
            .filter(Boolean)
            .join(" · ") || "Details not added yet"}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <StatusBadge status={record.status} />
          {record.status === "published" ? car.live ? <Tag tone="brass">On website</Tag> : <Tag tone="warning">Not on website</Tag> : null}
          {record.reserved ? <Tag>Reserved</Tag> : null}
          {record.featured ? <Tag tone="brass">Featured</Tag> : null}
          {car.issues && record.status !== "archived" ? (
            <Tag tone={record.status === "published" ? "warning" : "neutral"}>
              {car.issues} to fix before publishing
            </Tag>
          ) : null}
        </div>
        <p className="mt-2 text-sm md:hidden" data-numeric>
          {formatVehiclePrice(record)}
          <span className="text-[var(--muted-foreground)]"> · {car.photos} photos</span>
        </p>
      </div>

      <div className="hidden md:block">
        <p data-numeric className="text-sm">
          {record.priceOnApplication ? "POA" : record.price !== null ? formatVehiclePrice(record) : "No price"}
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">Updated {formatDate(record.updatedAt)}</p>
      </div>

      <div className="hidden text-xs text-[var(--muted-foreground)] md:block">
        <p data-numeric>
          {car.photos}/{LISTING_PHOTO_TARGET}+ photos
        </p>
        <p>
          {car.exterior ? "Exterior ✓" : "No exterior"} · {car.interior ? "Interior ✓" : "No interior"}
        </p>
      </div>

      <div className="col-span-2 flex gap-2 md:col-span-1 md:justify-end">
        <Link href={editHref} className="inline-flex h-11 flex-1 items-center justify-center border border-[var(--border-strong)] px-4 text-xs font-medium uppercase tracking-[0.12em] hover:border-[var(--primary)] md:flex-none">
          Edit
        </Link>
        <details className="group relative">
          <summary className="flex h-11 cursor-pointer list-none items-center gap-1 border border-[var(--border-strong)] px-3 text-xs font-medium uppercase tracking-[0.12em] hover:border-[var(--primary)] [&::-webkit-details-marker]:hidden">
            More
            <ChevronDown aria-hidden className="size-3.5 transition-transform group-open:rotate-180" />
            <span className="sr-only">actions for {car.name}</span>
          </summary>
          <div className="absolute right-0 z-20 mt-1 w-56 border border-[var(--border-strong)] bg-[var(--background)] py-1 shadow-lg">
            <RowActions car={car} />
          </div>
        </details>
      </div>
    </li>
  );
}

function RowActions({ car }: { car: VehicleSummary }) {
  const { record } = car;
  const plain = (intent: string, label: string) => (
    <form action={listAction}>
      <input type="hidden" name="id" value={record.id} />
      <input type="hidden" name="intent" value={intent} />
      <button type="submit" className="flex min-h-11 w-full items-center px-3 text-left text-sm hover:bg-[var(--surface)]">
        {label}
      </button>
    </form>
  );
  const fields = { id: record.id };

  return (
    <>
      {record.status === "draft" ? plain("publish", "Publish") : null}
      {record.status === "published" ? (
        <ConfirmButton
          buttonVariant="ghost"
          label="Unpublish"
          title="Take this car off the website?"
          body="It goes back to being a draft. You can publish it again at any time."
          confirmLabel="Unpublish"
          action={listAction}
          fields={{ ...fields, intent: "unpublish" }}
        />
      ) : null}
      {record.status === "published" ? plain(record.featured ? "unfeature" : "feature", record.featured ? "Remove from homepage" : "Feature on homepage") : null}
      {record.status === "published" ? (
        <ConfirmButton
          buttonVariant="ghost"
          label="Mark as sold"
          title="Mark this car as sold?"
          body="Its page stays on the website marked SOLD, and it leaves the stock list, the homepage and search."
          confirmLabel="Mark as sold"
          action={listAction}
          fields={{ ...fields, intent: "sold" }}
        />
      ) : null}
      {plain("duplicate", "Duplicate as a new draft")}
      {record.status === "archived" ? (
        plain("restore", "Restore as draft")
      ) : (
        <ConfirmButton
          buttonVariant="ghost"
          tone="danger"
          label="Archive"
          title="Archive this car?"
          body="It's hidden from the website and moved to Archived. Nothing is deleted — you can restore it later."
          confirmLabel="Archive"
          action={listAction}
          fields={{ ...fields, intent: "archive" }}
        />
      )}
    </>
  );
}
