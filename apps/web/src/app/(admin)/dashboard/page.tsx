import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";

import { Notice, PageTitle, Panel, StatusBadge, Tag, Thumb } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { createVehicle } from "@/lib/dashboard/actions";
import { LISTING_PHOTO_TARGET, loadAllRecords, summarise } from "@/lib/dashboard/inventory";
import { formatDate, formatPrice } from "@/lib/format";
import { leadStorageAvailable, listRecentLeads } from "@/lib/leads/store";
import { requireStaff } from "@/lib/server/staff";

export const metadata: Metadata = { title: "Overview" };

const KIND_LABEL = {
  "vehicle-enquiry": "Car enquiry",
  finance: "Finance",
  "part-exchange": "Part exchange",
  contact: "General",
} as const;

export default async function DashboardOverview() {
  await requireStaff();
  const [records, leads] = await Promise.all([loadAllRecords(), listRecentLeads(6)]);
  const cars = records.map(summarise);

  const live = cars.filter((car) => car.live && car.record.status === "published");
  const drafts = cars.filter((car) => car.record.status === "draft");
  const sold = cars.filter((car) => car.record.status === "sold");
  const withheld = cars.filter((car) => car.record.status === "published" && !car.live);
  const readyToPublish = drafts.filter((car) => car.issues === 0);
  const featuredLive = live.filter((car) => car.record.featured);
  const priced = live.filter((car) => car.record.price !== null && !car.record.priceOnApplication);
  const stockValue = priced.reduce((total, car) => total + (car.record.price ?? 0), 0);
  const poaCount = live.length - priced.length;

  const needsPhotos = cars
    .filter((car) => car.record.status === "draft" || car.record.status === "published")
    .filter((car) => car.exterior === 0 || car.interior === 0 || car.photos < LISTING_PHOTO_TARGET || !car.hasVideo)
    .slice(0, 6);

  return (
    <>
      <PageTitle
        title="Overview"
        description="Your stock at a glance. Figures come straight from your inventory — there is no visitor tracking on the website."
        actions={
          <form action={createVehicle}>
            <Button type="submit" size="md">
              <Plus className="size-4" />
              Add a car
            </Button>
          </form>
        }
      />

      {withheld.length ? (
        <Notice tone="error">
          {withheld.length === 1 ? "1 published car is" : `${withheld.length} published cars are`} not showing on the
          website because something is missing.{" "}
          <Link href={`/dashboard/inventory/${withheld[0]!.record.id}`} className="underline underline-offset-2">
            Review {withheld.length === 1 ? "it" : "the first one"}
          </Link>
          .
        </Notice>
      ) : null}

      <dl className="grid grid-cols-2 gap-px border border-[var(--border)] bg-[var(--border)] lg:grid-cols-4">
        <Metric label="On the website" value={String(live.length)} hint={`${featuredLive.length} featured on the homepage`} />
        <Metric label="Drafts" value={String(drafts.length)} hint={`${readyToPublish.length} ready to publish`} />
        <Metric label="Sold" value={String(sold.length)} hint="Pages stay up, marked sold" />
        <Metric
          label="Stock for sale"
          value={priced.length ? formatPrice(stockValue) : "—"}
          hint={poaCount ? `Plus ${poaCount} POA` : "Cash prices of cars on the website"}
        />
      </dl>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel
          title="Photography and listing quality"
          action={
            <Link href="/dashboard/inventory" className="text-xs underline underline-offset-2">
              All cars
            </Link>
          }
        >
          {needsPhotos.length ? (
            <ul className="divide-y divide-[var(--border)]">
              {needsPhotos.map((car) => (
                <li key={car.record.id}>
                  <Link href={`/dashboard/inventory/${car.record.id}#section-media`} className="flex items-center gap-4 py-3 hover:bg-[var(--surface)]">
                    <Thumb image={car.cover} className="w-16 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{car.name}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <StatusBadge status={car.record.status} />
                        {car.exterior === 0 ? <Tag tone="warning">No exterior photo</Tag> : null}
                        {car.interior === 0 ? <Tag tone="warning">No interior photo</Tag> : null}
                        <Tag>
                          {car.photos}/{LISTING_PHOTO_TARGET}+ photos
                        </Tag>
                        {!car.hasVideo ? <Tag>No walkaround</Tag> : null}
                      </div>
                    </div>
                    <ArrowRight aria-hidden className="size-4 shrink-0 text-[var(--muted-foreground)]" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">
              {cars.length ? "Every car for sale meets the photography standard." : "No cars yet. Add your first car to get started."}
            </p>
          )}
        </Panel>

        <Panel
          title="Recent enquiries"
          action={
            <Link href="/dashboard/enquiries" className="text-xs underline underline-offset-2">
              All enquiries
            </Link>
          }
        >
          {!leadStorageAvailable() ? (
            <p className="text-sm text-[var(--muted-foreground)]">Enquiry storage isn&rsquo;t connected on this server.</p>
          ) : leads.length ? (
            <ul className="divide-y divide-[var(--border)]">
              {leads.map((lead) => (
                <li key={lead.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{lead.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {KIND_LABEL[lead.kind]} · {formatDate(lead.createdAt)}
                    </p>
                  </div>
                  {lead.status === "new" ? <Tag tone="brass">New</Tag> : <Tag>{lead.status === "contacted" ? "Contacted" : "Closed"}</Tag>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">No enquiries yet. They&rsquo;ll appear here as soon as someone uses a form on the website.</p>
          )}
        </Panel>
      </div>

      {featuredLive.length || readyToPublish.length ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Panel title="Featured on the homepage">
            {featuredLive.length ? (
              <ul className="space-y-2 text-sm">
                {featuredLive.map((car) => (
                  <li key={car.record.id}>
                    <Link href={`/dashboard/inventory/${car.record.id}`} className="underline-offset-2 hover:underline">
                      {car.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">
                Nothing is featured, so the homepage shows no car grid. Feature a car from its page.
              </p>
            )}
          </Panel>
          <Panel title="Ready to publish">
            {readyToPublish.length ? (
              <ul className="space-y-2 text-sm">
                {readyToPublish.map((car) => (
                  <li key={car.record.id}>
                    <Link href={`/dashboard/inventory/${car.record.id}`} className="underline-offset-2 hover:underline">
                      {car.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">No drafts have everything they need yet.</p>
            )}
          </Panel>
        </div>
      ) : null}
    </>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="bg-[var(--background)] p-5">
      <dt className="text-xs uppercase tracking-[0.08em] text-[var(--muted-foreground)]">{label}</dt>
      <dd>
        <span data-numeric className="mt-2 block font-display text-3xl">
          {value}
        </span>
        <span className="mt-1 block text-xs text-[var(--muted-foreground)]">{hint}</span>
      </dd>
    </div>
  );
}
