"use client";

import { APPOINTMENT_STATUSES, APPOINTMENT_TYPES, type AppointmentListQuery, type AppointmentStatus, type AppointmentType } from "@Stratford-city-motorcars-Ltd/core";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, CalendarPlus, List } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ErrorState, Notice, PageBody, PageHeader } from "@/components/ui/page";
import { api } from "@/lib/api";
import { dateKey, formatWeekdayDate, fromDateTimeInput, plural, toDateTimeInput } from "@/lib/format";
import { queryKeys } from "@/lib/query";
import { useSession } from "@/lib/session";

import { AppointmentSheet } from "./appointment-sheet";
import { BookingCalendar, parseMonth } from "./booking-calendar";
import { BookingList, LIST_TABS, type ListFilters, type ListTab } from "./booking-list";
import { needsOutcome } from "./parts";

const ALL: AppointmentListQuery = { status: "all" };

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value && allowed.includes(value as T) ? (value as T) : fallback;
}

/** A sensible start for a booking made from a calendar day: 1pm, or the next hour if that has gone. */
function startOn(day: string): string {
  const now = toDateTimeInput(new Date().toISOString());
  if (day === now.slice(0, 10)) {
    const hour = Math.min(23, Math.max(13, Number(now.slice(11, 13)) + 1));
    return fromDateTimeInput(`${day}T${String(hour).padStart(2, "0")}:00`);
  }
  return fromDateTimeInput(`${day}T13:00`);
}

/**
 * Viewings and test drives: a month calendar (the default) and a list of
 * every booking, both in the URL so a view can be reloaded, shared or gone back
 * to. Nothing here contacts the customer — confirm times by phone or WhatsApp
 * as usual.
 */
export function Viewings() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { can } = useSession();
  const canEdit = can("appointments.edit");

  // The month calendar is the default; the list is one click away and remembered as ?view=list.
  const view = params.get("view") === "list" ? "list" : "calendar";
  const month = parseMonth(params.get("month"));
  const filters: ListFilters = {
    tab: pick<ListTab>(params.get("tab"), LIST_TABS, "upcoming"),
    status: pick<AppointmentStatus | "all">(params.get("status"), ["all", ...APPOINTMENT_STATUSES.map((item) => item.value)], "all"),
    type: pick<AppointmentType | "all">(params.get("type"), ["all", ...APPOINTMENT_TYPES.map((item) => item.value)], "all"),
    q: params.get("q") ?? "",
  };
  const creating = params.get("new") === "1";
  const startDay = params.get("date");
  const openId = params.get("open");

  /** Filters and sheets replace the entry; changing view or month adds one, so Back returns to it. */
  const setParams = (next: Record<string, string | undefined>) => {
    const query = new URLSearchParams(params.toString());
    // The old week diary's parameter has no meaning any more.
    query.delete("week");
    for (const [key, value] of Object.entries(next)) {
      const isDefault = (key === "tab" && value === "upcoming") || (key === "view" && value === "calendar") || ((key === "status" || key === "type") && value === "all");
      if (value === undefined || value === "" || isDefault) query.delete(key);
      else query.set(key, value);
    }
    if (query.get("view") === "calendar") query.delete("view");
    const href = `${pathname}${query.size ? `?${query}` : ""}` as Route;
    if ("view" in next || "month" in next) router.push(href, { scroll: false });
    else router.replace(href, { scroll: false });
  };

  const { data, isPending, error, refetch } = useQuery({
    queryKey: queryKeys.appointments(ALL),
    queryFn: () => api.appointments.list(ALL),
  });
  const team = useQuery({ queryKey: queryKeys.team, queryFn: () => api.team.list() });
  const members = new Map((team.data ?? []).map((member) => [member.id, member]));

  const overdue = (data ?? []).filter((item) => needsOutcome(item)).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const opened = openId ? data?.find((item) => item.id === openId) : undefined;
  const open = (id: string) => setParams({ open: id });
  const startNew = canEdit ? (day?: string) => setParams({ new: "1", date: day }) : undefined;

  const arrange = canEdit ? (
    <Button variant="primary" onClick={() => startNew?.()}>
      <CalendarPlus aria-hidden />
      Arrange a viewing
    </Button>
  ) : null;

  return (
    <PageBody>
      {view === "list" ? (
        <PageHeader
          eyebrow="Sales"
          title="Viewings & test drives"
          description="Who is coming in, to see which car, and who is meeting them. Arrange one from an enquiry, or here for someone who rang or walked in."
          actions={
            <>
              <Button onClick={() => setParams({ view: "calendar" })}>
                <CalendarDays aria-hidden />
                Calendar
              </Button>
              {arrange}
            </>
          }
        />
      ) : (
        <PageHeader
          eyebrow={
            <span className="inline-flex items-center gap-2">
              <button type="button" onClick={() => setParams({ view: "list", month: undefined })} className="uppercase transition-colors hover:text-foreground">
                Viewings
              </button>
              <span aria-hidden className="text-ink-400">
                /
              </span>
              <span aria-current="page" className="text-ink-600">
                Calendar
              </span>
            </span>
          }
          title="Viewings & test drives"
          description="The month at a glance. Open a booking to change it or record how it went; choose an empty day to arrange one."
          actions={
            <>
              <Button onClick={() => setParams({ view: "list", month: undefined })}>
                <List aria-hidden />
                List view
              </Button>
              {arrange}
            </>
          }
        />
      )}

      {overdue.length ? (
        <Notice
          tone="warning"
          className="mb-5"
          title={`${plural(overdue.length, "appointment")} in the past without an outcome`}
          action={
            <Button size="sm" onClick={() => open(overdue[0]!.id)}>
              Record the first
            </Button>
          }
        >
          {overdue.map((item) => `${item.customerName} (${formatWeekdayDate(item.startsAt)})`).join(", ")} — mark each completed, a no-show or cancelled.
        </Notice>
      ) : null}

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} title="Viewings and test drives could not be loaded" />
      ) : view === "list" ? (
        <BookingList appointments={data} pending={isPending} members={members} filters={filters} onFilters={setParams} onOpen={open} onNew={startNew ? () => startNew() : undefined} />
      ) : (
        <BookingCalendar appointments={data} pending={isPending} month={month} onMonth={(next) => setParams({ month: next })} onOpen={open} onNew={startNew} />
      )}

      {creating ? (
        <AppointmentSheet
          prefill={startDay && /^\d{4}-\d{2}-\d{2}$/.test(startDay) && startDay >= dateKey(new Date()) ? { startsAt: startOn(startDay) } : undefined}
          onClose={() => setParams({ new: undefined, date: undefined })}
        />
      ) : null}
      {opened ? <AppointmentSheet key={opened.id} appointment={opened} onClose={() => setParams({ open: undefined })} /> : null}
    </PageBody>
  );
}
