"use client";

import type { Appointment } from "@Stratford-city-motorcars-Ltd/core";
import { useState } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight, KeyRound, Plus } from "lucide-react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";

import { AppointmentStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/page";
import { dateKey, formatDayLabel, formatTime, plural } from "@/lib/format";

import { AppointmentCard, needsOutcome } from "./parts";

const DAY = 86_400_000;
const SHOWN_PER_DAY = 3;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** "2026-09" for the month containing `date`, in showroom time. */
export function monthKey(date: Date | string = new Date()) {
  return dateKey(date).slice(0, 7);
}

export function parseMonth(value: string | null): string {
  return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : monthKey();
}

export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1 + by, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

const monthTitle = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const dayTitle = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

type Cell = { key: string; date: Date; inMonth: boolean; weekend: boolean };

/** Monday-first weeks covering the month; calendar dates only, no time zones. */
function monthGrid(month: string): Cell[] {
  const [y, m] = month.split("-").map(Number);
  const first = Date.UTC(y!, m! - 1, 1);
  const lead = (new Date(first).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(y!, m!, 0)).getUTCDate();
  const weeks = Math.ceil((lead + days) / 7);
  return Array.from({ length: weeks * 7 }, (_, i) => {
    const date = new Date(first + (i - lead) * DAY);
    const key = date.toISOString().slice(0, 10);
    return { key, date, inMonth: key.slice(0, 7) === month, weekend: i % 7 >= 5 };
  });
}

/**
 * A month of bookings at a glance. On phones the grid gives way to an agenda
 * of the same month — seven columns at 390px wide help nobody.
 */
export function BookingCalendar({
  appointments,
  pending,
  month,
  onMonth,
  onOpen,
  onNew,
}: {
  appointments: Appointment[] | undefined;
  pending: boolean;
  month: string;
  onMonth: (month: string | undefined) => void;
  onOpen: (id: string) => void;
  /** Start a booking on a day ("YYYY-MM-DD"); absent without permission. */
  onNew?: (day?: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const cells = monthGrid(month);
  const todayKey = dateKey(new Date());
  const thisMonth = monthKey();

  const byDay = new Map<string, Appointment[]>();
  for (const item of [...(appointments ?? [])].sort((a, b) => a.startsAt.localeCompare(b.startsAt))) {
    const key = dateKey(item.startsAt);
    byDay.set(key, [...(byDay.get(key) ?? []), item]);
  }
  const inMonth = (appointments ?? []).filter((item) => monthKey(item.startsAt) === month);
  const cancelled = inMonth.filter((item) => item.status === "cancelled").length;
  const [y, m] = month.split("-").map(Number);
  const agendaDays = cells.filter((cell) => cell.inMonth && byDay.has(cell.key));

  return (
    <section aria-label="Month calendar">
      <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-2xl leading-tight sm:text-[1.75rem]" aria-live="polite">
            {monthTitle.format(new Date(Date.UTC(y!, m! - 1, 1)))}
          </h2>
          <p data-numeric className="mt-1 text-[0.8125rem] text-muted-foreground">
            {pending ? "Loading…" : inMonth.length ? `${plural(inMonth.length, "booking")}${cancelled ? `, ${cancelled} cancelled` : ""}` : "No bookings"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="secondary" onClick={() => onMonth(undefined)} disabled={month === thisMonth}>
            Today
          </Button>
          <button type="button" onClick={() => onMonth(shiftMonth(month, -1))} aria-label="Previous month" className="inline-flex size-11 items-center justify-center border border-border bg-surface-raised hover:border-ink-400 sm:size-10">
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <button type="button" onClick={() => onMonth(shiftMonth(month, 1))} aria-label="Next month" className="inline-flex size-11 items-center justify-center border border-border bg-surface-raised hover:border-ink-400 sm:size-10">
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      {/* Tablets and up: the month grid. */}
      <div className="hidden border border-border bg-border sm:block" aria-busy={pending}>
        <div className="grid grid-cols-7 gap-px">
          {WEEKDAYS.map((day, i) => (
            <div key={day} className={cn("admin-label px-2.5 py-2", i >= 5 ? "bg-surface" : "bg-surface-raised")}>
              {day}
            </div>
          ))}
        </div>
        <div className="mt-px grid grid-cols-7 gap-px">
          {cells.map((cell) => {
            const items = byDay.get(cell.key) ?? [];
            const today = cell.key === todayKey;
            const open = expanded === cell.key;
            const shown = open ? items : items.slice(0, items.length > SHOWN_PER_DAY + 1 ? SHOWN_PER_DAY : SHOWN_PER_DAY + 1);
            const hidden = items.length - shown.length;
            const label = dayTitle.format(cell.date);
            const canStart = onNew && cell.key >= todayKey;
            return (
              <div
                key={cell.key}
                role="group"
                aria-label={`${label}${items.length ? `, ${plural(items.length, "booking")}` : ""}`}
                className={cn(
                  "group/day relative flex min-h-32 min-w-0 flex-col gap-1 p-1.5 lg:min-h-36 xl:min-h-40 xl:p-2",
                  cell.weekend ? "bg-surface" : "bg-surface-raised",
                  !cell.inMonth && "bg-surface/60",
                  today && "shadow-[inset_0_2px_0_var(--color-brass)]",
                )}
              >
                {canStart ? (
                  <button
                    type="button"
                    onClick={() => onNew(cell.key)}
                    aria-label={`Arrange a booking on ${label}`}
                    className="absolute inset-0 z-0 cursor-pointer transition-colors hover:bg-ink-50/70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink-900"
                  />
                ) : null}
                <div className="pointer-events-none relative z-10 flex items-center gap-1.5 px-0.5">
                  <span
                    data-numeric
                    className={cn(
                      "inline-flex h-6 min-w-6 items-center justify-center px-1 text-[0.8125rem]",
                      today ? "bg-ink-950 font-medium text-bone" : cell.inMonth ? "text-ink-800" : "text-ink-400",
                    )}
                  >
                    {cell.date.getUTCDate()}
                  </span>
                  {today ? <span className="text-[0.625rem] font-medium tracking-[0.1em] text-brass-deep uppercase">Today</span> : null}
                  {canStart ? <Plus className="ml-auto size-3.5 text-ink-400 opacity-0 transition-opacity group-hover/day:opacity-100" aria-hidden /> : null}
                </div>
                {pending && cell.inMonth && cell.date.getUTCDate() % 5 === 2 ? <Skeleton className="relative z-10 h-9" /> : null}
                <ul className={cn("relative z-10 flex min-w-0 flex-col gap-1", !cell.inMonth && "opacity-60")}>
                  {shown.map((item) => (
                    <li key={item.id} className="min-w-0">
                      <CalendarEntry appointment={item} onOpen={() => onOpen(item.id)} />
                    </li>
                  ))}
                </ul>
                {hidden > 0 || (open && items.length > SHOWN_PER_DAY + 1) ? (
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : cell.key)}
                    className="relative z-10 self-start px-1 text-xs font-medium text-ink-700 underline decoration-brass underline-offset-4 hover:text-foreground"
                  >
                    {open ? "Show fewer" : `+${hidden} more`}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Phones: the same month as an agenda. */}
      <div className="sm:hidden">
        {pending ? (
          <div className="space-y-3" role="status" aria-label="Loading bookings">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : agendaDays.length ? (
          <ol className="space-y-5">
            {agendaDays.map((cell) => (
              <li key={cell.key}>
                <h3 className={cn("admin-label mb-2", cell.key === todayKey && "text-brass-deep")}>
                  {cell.key === todayKey ? `Today · ${dayTitle.format(cell.date)}` : dayTitle.format(cell.date)}
                </h3>
                <ul className="space-y-2">
                  {byDay.get(cell.key)!.map((item) => (
                    <li key={item.id}>
                      <AppointmentCard appointment={item} onOpen={() => onOpen(item.id)} />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState
            compact
            title="Nothing booked this month"
            body="Move to another month with the arrows, or arrange a booking."
            action={
              onNew ? (
                <Button onClick={() => onNew()}>
                  <CalendarPlus aria-hidden />
                  Arrange a viewing
                </Button>
              ) : null
            }
          />
        )}
      </div>
    </section>
  );
}

function CalendarEntry({ appointment, onOpen }: { appointment: Appointment; onOpen: () => void }) {
  const cancelled = appointment.status === "cancelled";
  const closed = cancelled || appointment.status === "completed" || appointment.status === "no-show";
  const who = [appointment.enquiryReference, appointment.customerName].filter(Boolean).join(" · ");
  return (
    <button
      type="button"
      onClick={onOpen}
      title={`${formatDayLabel(appointment.startsAt)} ${formatTime(appointment.startsAt)} — ${appointment.type === "test-drive" ? "Test drive" : "Viewing"} with ${appointment.customerName}${appointment.vehicleTitle ? `, ${appointment.vehicleTitle}` : ""}`}
      className={cn(
        "block w-full min-w-0 border border-l-2 px-1.5 py-1 text-left transition-colors hover:border-ink-400 xl:px-2",
        appointment.status === "requested" ? "border-border border-l-brass bg-surface-raised" : appointment.status === "confirmed" ? "border-border border-l-ink-950 bg-surface-raised" : "border-border border-l-ink-300 bg-surface",
        cancelled && "border-dashed border-ink-300 bg-transparent text-ink-500",
        needsOutcome(appointment) && "bg-brass/8",
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <span data-numeric className={cn("text-xs font-medium", closed && "font-normal")}>
          {formatTime(appointment.startsAt)}
        </span>
        {appointment.type === "test-drive" ? <KeyRound className="size-3 shrink-0 text-ink-500" aria-label="Test drive" /> : null}
        <AppointmentStatusBadge status={appointment.status} className="ml-auto hidden h-[1.125rem] min-w-0 gap-1 overflow-hidden px-1 text-[0.5625rem] tracking-[0.06em] xl:inline-flex" />
      </span>
      <span data-numeric className={cn("mt-0.5 block truncate text-[0.6875rem] leading-snug text-ink-700", cancelled && "text-ink-500 line-through decoration-ink-300")}>
        {who}
      </span>
    </button>
  );
}
