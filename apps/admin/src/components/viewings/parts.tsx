"use client";

import { ACTIVE_APPOINTMENT_STATUSES, type Appointment, type AppointmentInput, type AppointmentStatus } from "@Stratford-city-motorcars-Ltd/core";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Ban, CalendarCheck, CircleCheck, FileText, KeyRound, PencilLine, UserRound, UserX } from "lucide-react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";

import { routes } from "@/components/shell/routes";
import { AppointmentStatusBadge } from "@/components/ui/badge";
import { ActionMenu, type MenuAction } from "@/components/ui/menu";
import { api } from "@/lib/api";
import { dateKey, formatTime } from "@/lib/format";
import { useAdminMutation } from "@/lib/query";
import { useSession } from "@/lib/session";

/** Settled appointments: they took place, or never will. */
export function isClosed(appointment: Pick<Appointment, "status">) {
  return !ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status);
}

/** Still "to confirm" or "confirmed" an hour after it started: it needs an outcome. */
export function needsOutcome(appointment: Appointment, now = Date.now()) {
  return !isClosed(appointment) && new Date(appointment.startsAt).getTime() < now - 60 * 60_000;
}

/** Upcoming: not yet settled, and today or later in showroom time. */
export function isUpcoming(appointment: Appointment, todayKey = dateKey(new Date())) {
  return !isClosed(appointment) && dateKey(appointment.startsAt) >= todayKey;
}

export function typeLabel(appointment: Pick<Appointment, "type">) {
  return appointment.type === "test-drive" ? "Test drive" : "Viewing";
}

function toInput(appointment: Appointment, status: AppointmentStatus): AppointmentInput {
  return {
    type: appointment.type,
    status,
    startsAt: appointment.startsAt,
    durationMinutes: appointment.durationMinutes,
    vehicleId: appointment.vehicleId,
    customerId: appointment.customerId,
    customerName: appointment.customerName,
    customerPhone: appointment.customerPhone,
    enquiryId: appointment.enquiryId,
    handledBy: appointment.handledBy,
    notes: appointment.notes,
    checks: appointment.checks,
  };
}

const statusDone: Record<AppointmentStatus, string> = {
  requested: "Marked to confirm",
  confirmed: "Marked confirmed",
  completed: "Marked completed",
  "no-show": "Marked a no-show",
  cancelled: "Appointment cancelled",
};

/**
 * The "…" menu on a booking: open it, move its status along in one step, or
 * jump to the enquiry and customer it belongs to. Every status change goes
 * through the same versioned update the sheet uses.
 */
export function BookingActions({ appointment, onOpen }: { appointment: Appointment; onOpen: () => void }) {
  const router = useRouter();
  const { can } = useSession();
  const canEdit = can("appointments.edit");
  const setStatus = useAdminMutation(
    (status: AppointmentStatus) => api.appointments.update(appointment.id, toInput(appointment, status), { expectedUpdatedAt: appointment.updatedAt }),
    { success: (saved) => statusDone[saved.status], failure: "The appointment could not be updated" },
  );

  const started = new Date(appointment.startsAt).getTime() < Date.now();
  const status = appointment.status;
  const move = (next: AppointmentStatus, label: string, icon: ReactNode, hidden: boolean, tone?: "danger"): MenuAction => ({
    label,
    icon,
    tone,
    hidden: !canEdit || hidden || status === next,
    disabled: setStatus.isPending,
    onSelect: () => setStatus.mutate(next),
  });

  const actions: MenuAction[] = [
    { label: canEdit ? "Edit appointment" : "View appointment", icon: <PencilLine className="size-4" aria-hidden />, onSelect: onOpen },
    "separator",
    move("confirmed", "Mark confirmed", <CalendarCheck className="size-4" aria-hidden />, status !== "requested"),
    move("completed", "Mark completed", <CircleCheck className="size-4" aria-hidden />, !started && status !== "no-show"),
    move("no-show", "Mark a no-show", <UserX className="size-4" aria-hidden />, !started && status !== "completed"),
    move("confirmed", "Reopen", <CalendarCheck className="size-4" aria-hidden />, !isClosed(appointment) || started),
    move("cancelled", "Cancel appointment", <Ban className="size-4" aria-hidden />, isClosed(appointment), "danger"),
    "separator",
    {
      label: `Open enquiry${appointment.enquiryReference ? ` ${appointment.enquiryReference}` : ""}`,
      icon: <FileText className="size-4" aria-hidden />,
      hidden: !appointment.enquiryId,
      onSelect: () => router.push(routes.enquiry(appointment.enquiryId!)),
    },
    {
      label: "Open customer",
      icon: <UserRound className="size-4" aria-hidden />,
      hidden: !appointment.customerId,
      onSelect: () => router.push(routes.customer(appointment.customerId!)),
    },
  ];

  return <ActionMenu label={`Actions for ${appointment.customerName}, ${formatTime(appointment.startsAt)}`} actions={actions} />;
}

/** A booking as a card, for the phone agenda. */
export function AppointmentCard({ appointment, onOpen, showDate }: { appointment: Appointment; onOpen: () => void; showDate?: string }) {
  const closed = isClosed(appointment);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full items-start justify-between gap-3 border border-l-2 bg-surface-raised px-4 py-3 text-left transition-colors hover:border-ink-400",
        appointment.status === "requested" ? "border-l-brass" : appointment.status === "confirmed" ? "border-l-ink-950" : "border-l-ink-300",
        closed && "bg-surface",
        appointment.status === "cancelled" && "border-dashed text-ink-500",
      )}
    >
      <span className="block min-w-0">
        <span data-numeric className="flex items-center gap-1.5 text-sm font-medium">
          {showDate ? `${showDate}, ` : null}
          {formatTime(appointment.startsAt)}
          {appointment.type === "test-drive" ? <KeyRound className="size-3 text-ink-500" aria-label="Test drive" /> : null}
          {needsOutcome(appointment) ? <span className="text-[0.625rem] font-normal text-brass-deep uppercase">Outcome?</span> : null}
        </span>
        <span className={cn("block truncate text-sm", appointment.status === "cancelled" && "line-through decoration-ink-300")}>{appointment.customerName}</span>
        <span className="block truncate text-xs text-ink-600">
          {typeLabel(appointment)} · {appointment.vehicleTitle ?? "Car not set"}
        </span>
        {appointment.type === "test-drive" && appointment.status !== "cancelled" ? (
          <span className="mt-1 flex items-center gap-1 text-[0.6875rem] text-ink-500">
            <CircleCheck className={cn("size-3", appointment.checks.licenceSeen ? "text-success" : "text-ink-300")} aria-hidden />
            Licence {appointment.checks.licenceSeen ? "seen" : "not seen"}
          </span>
        ) : null}
      </span>
      <AppointmentStatusBadge status={appointment.status} />
    </button>
  );
}
