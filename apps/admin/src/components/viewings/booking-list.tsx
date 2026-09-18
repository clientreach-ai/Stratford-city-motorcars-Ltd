"use client";

import { APPOINTMENT_STATUSES, APPOINTMENT_TYPES, type Appointment, type AppointmentStatus, type AppointmentType, type TeamMember } from "@Stratford-city-motorcars-Ltd/core";
import { useEffect, useState } from "react";
import { CalendarPlus, KeyRound } from "lucide-react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";

import { MemberInitials } from "@/components/enquiries/parts";
import { AppointmentStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingRows } from "@/components/ui/page";
import { DataTable, rowLinkClass, type Column } from "@/components/ui/table";
import { FilterSelect, ResultCount, SearchField, SegmentedFilter, Toolbar } from "@/components/ui/toolbar";
import { dateKey, formatDayLabel, formatTime } from "@/lib/format";

import { BookingActions, isUpcoming, needsOutcome, typeLabel } from "./parts";

export type ListTab = "upcoming" | "past" | "all";
export const LIST_TABS: readonly ListTab[] = ["upcoming", "past", "all"];

export type ListFilters = {
  tab: ListTab;
  status: AppointmentStatus | "all";
  type: AppointmentType | "all";
  q: string;
};

function useDebounced<T>(value: T, ms = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

const time = (appointment: Appointment) => new Date(appointment.startsAt).getTime();

/**
 * Every booking in one table: upcoming first, past ones and their outcomes a
 * tab away. Filtering happens here — the diary is small enough to load whole.
 */
export function BookingList({
  appointments,
  pending,
  members,
  filters,
  onFilters,
  onOpen,
  onNew,
}: {
  appointments: Appointment[] | undefined;
  pending: boolean;
  members: Map<string, TeamMember>;
  filters: ListFilters;
  onFilters: (next: Partial<Record<keyof ListFilters, string | undefined>>) => void;
  onOpen: (id: string) => void;
  onNew?: () => void;
}) {
  const [search, setSearch] = useState(filters.q);
  const debounced = useDebounced(search.trim());

  useEffect(() => {
    if (debounced !== filters.q) onFilters({ q: debounced || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- push the debounced search into the URL only
  }, [debounced]);

  const todayKey = dateKey(new Date());
  const all = appointments ?? [];
  const upcoming = all.filter((item) => isUpcoming(item, todayKey));
  const inTab = filters.tab === "upcoming" ? upcoming : filters.tab === "past" ? all.filter((item) => !isUpcoming(item, todayKey)) : all;

  const needle = filters.q.toLowerCase();
  const rows = inTab.filter((item) => {
    if (filters.status !== "all" && item.status !== filters.status) return false;
    if (filters.type !== "all" && item.type !== filters.type) return false;
    if (!needle) return true;
    return [item.customerName, item.enquiryReference, item.vehicleTitle, item.customerPhone].some((field) => field?.toLowerCase().includes(needle));
  });
  const filtered = Boolean(filters.q) || filters.status !== "all" || filters.type !== "all";

  const clear = () => {
    setSearch("");
    onFilters({ q: undefined, status: undefined, type: undefined });
  };

  const columns: Column<Appointment>[] = [
    {
      id: "date",
      header: "Date",
      className: "w-36",
      sortValue: time,
      cell: (item) => (
        <div data-numeric>
          <p className={cn("text-sm whitespace-nowrap", dateKey(item.startsAt) === todayKey && "font-medium text-brass-deep")}>{formatDayLabel(item.startsAt)}</p>
          <p className="mt-0.5 text-xs text-ink-500">
            {formatTime(item.startsAt)}
            <span className="text-ink-400"> · {item.durationMinutes} min</span>
          </p>
        </div>
      ),
    },
    {
      id: "customer",
      header: "Customer",
      sortValue: (item) => item.customerName.toLowerCase(),
      cell: (item) => (
        <div className="min-w-0">
          <button type="button" onClick={() => onOpen(item.id)} className={cn(rowLinkClass, "text-left", item.status === "cancelled" && "text-ink-500 line-through decoration-ink-300")}>
            {item.customerName}
          </button>
          <p data-numeric className="mt-0.5 text-xs whitespace-nowrap text-ink-500">
            {item.enquiryReference ?? "No enquiry"}
            {needsOutcome(item) ? <span className="ml-2 text-[0.625rem] font-medium tracking-[0.08em] text-brass-deep uppercase">Outcome?</span> : null}
          </p>
        </div>
      ),
    },
    {
      id: "booking",
      header: "Booking",
      cell: (item) => (
        <div className="min-w-0 max-w-sm">
          <p className="flex items-center gap-1.5 text-sm">
            {item.type === "test-drive" ? <KeyRound className="size-3.5 text-ink-500" aria-hidden /> : null}
            {typeLabel(item)}
          </p>
          <p className="mt-0.5 truncate text-xs text-ink-500">{item.vehicleTitle ?? "Car not set"}</p>
        </div>
      ),
    },
    {
      id: "handler",
      header: "Who is meeting them",
      minWidth: "xl",
      cell: (item) =>
        item.handledBy && members.get(item.handledBy) ? <MemberInitials member={members.get(item.handledBy)} /> : <span className="text-xs text-ink-500">Not decided</span>,
    },
    {
      id: "status",
      header: "Status",
      className: "w-36",
      sortValue: (item) => APPOINTMENT_STATUSES.findIndex((option) => option.value === item.status),
      cell: (item) => <AppointmentStatusBadge status={item.status} />,
    },
  ];

  const tabs = [
    { value: "upcoming" as const, label: "Upcoming", count: appointments ? upcoming.length : undefined },
    { value: "past" as const, label: "Past & closed", count: appointments ? all.length - upcoming.length : undefined },
    { value: "all" as const, label: "All", count: appointments ? all.length : undefined },
  ];

  return (
    <>
      <SegmentedFilter label="Which bookings" value={filters.tab} onChange={(value) => onFilters({ tab: value })} options={tabs} className="mb-4" />

      <Toolbar>
        <SearchField label="Search bookings" placeholder="Reference, customer or car" value={search} onChange={setSearch} className="sm:w-60 lg:w-64 xl:w-80" />
        <FilterSelect label="Filter by status" allLabel="Any status" value={filters.status} onChange={(value) => onFilters({ status: value })} options={APPOINTMENT_STATUSES} className="sm:w-44" />
        <FilterSelect label="Filter by type" allLabel="Any type" value={filters.type} onChange={(value) => onFilters({ type: value })} options={APPOINTMENT_TYPES} className="sm:w-36" />
        {appointments ? <ResultCount count={rows.length} total={inTab.length} noun={["booking", "bookings"]} /> : null}
      </Toolbar>

      {pending ? (
        <LoadingRows label="Loading bookings" thumb={false} rows={5} />
      ) : rows.length === 0 ? (
        filtered ? (
          <EmptyState compact title="No bookings match" body="Try a different search, or clear the filters." action={<Button onClick={clear}>Clear filters</Button>} />
        ) : filters.tab === "upcoming" ? (
          <EmptyState
            compact
            icon={<CalendarPlus />}
            title="Nothing coming up"
            body={all.length ? "No viewings or test drives are booked from today on. Past ones and their outcomes are under Past & closed." : "No viewings or test drives have been arranged yet. Arrange one from an enquiry, or here for someone who rang or walked in."}
            action={
              onNew ? (
                <Button onClick={onNew}>
                  <CalendarPlus aria-hidden />
                  Arrange a viewing
                </Button>
              ) : null
            }
          />
        ) : (
          <EmptyState compact title="Nothing here" body={filters.tab === "past" ? "Once a booking has passed or been settled, it moves here." : "No viewings or test drives have been arranged yet."} />
        )
      ) : (
        <DataTable
          // A fresh table per tab, so each opens in its natural order.
          key={filters.tab}
          caption="Viewings and test drives"
          rows={rows}
          columns={columns}
          rowKey={(item) => item.id}
          initialSort={{ id: "date", direction: filters.tab === "past" ? "desc" : "asc" }}
          rowClassName={(item) => cn("[&>td]:py-4", item.status === "cancelled" && "bg-surface/70 text-ink-500", needsOutcome(item) && "bg-brass/[0.04]")}
          actions={(item) => <BookingActions appointment={item} onOpen={() => onOpen(item.id)} />}
          renderCard={(item) => (
            <div className="min-w-0">
              <div className="flex items-start justify-between gap-3">
                <button type="button" onClick={() => onOpen(item.id)} className={cn(rowLinkClass, "truncate text-left", item.status === "cancelled" && "text-ink-500 line-through decoration-ink-300")}>
                  {item.customerName}
                </button>
                <span data-numeric className={cn("shrink-0 text-xs text-ink-500", dateKey(item.startsAt) === todayKey && "font-medium text-brass-deep")}>
                  {formatDayLabel(item.startsAt)}, {formatTime(item.startsAt)}
                </span>
              </div>
              <p className="mt-0.5 truncate text-[0.8125rem] text-ink-700">
                {typeLabel(item)} · {item.vehicleTitle ?? "Car not set"}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <AppointmentStatusBadge status={item.status} />
                {item.enquiryReference ? (
                  <span data-numeric className="text-xs text-ink-500">
                    {item.enquiryReference}
                  </span>
                ) : null}
                {needsOutcome(item) ? <span className="text-[0.625rem] font-medium tracking-[0.08em] text-brass-deep uppercase">Outcome?</span> : null}
              </div>
            </div>
          )}
        />
      )}
    </>
  );
}
