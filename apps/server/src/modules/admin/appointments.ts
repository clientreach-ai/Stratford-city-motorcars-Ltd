import { eq, tables } from "@Stratford-city-motorcars-Ltd/db";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPES,
  type Appointment,
  type AppointmentInput,
} from "@Stratford-city-motorcars-Ltd/core/appointment";
import { enquiryStatusLabel, type EnquiryStatus } from "@Stratford-city-motorcars-Ltd/core/enquiry";
import { NotFoundError, ValidationError } from "@Stratford-city-motorcars-Ltd/core/errors";
import type { SessionUser } from "@Stratford-city-motorcars-Ltd/core/team";
import { Hono } from "hono";
import { z } from "zod";

import { db } from "../../lib/db";
import { validate } from "../../lib/validation";
import { listVehicles } from "../vehicles/repository";
import { checkVersion, requireCapability, stamp, type AdminEnv } from "./context";
import { loadAppointments, loadLeads, logActivity, toAppointment, type AppointmentRow, type Executor } from "./data";

/**
 * Viewings and test drives — see the contract. Times outside opening hours are
 * allowed (weekends are by appointment); the admin warns, the API accepts.
 */

const { appointment, lead, customer, user } = tables;

const types = APPOINTMENT_TYPES.map((item) => item.value) as [Appointment["type"], ...Appointment["type"][]];
const statuses = APPOINTMENT_STATUSES.map((item) => item.value) as [Appointment["status"], ...Appointment["status"][]];

const listQuery = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  status: z.enum([...statuses, "active", "all"]).optional(),
  type: z.enum([...types, "all"]).optional(),
  vehicleId: z.string().max(64).optional(),
  customerId: z.string().max(64).optional(),
});

const inputSchema = z.object({
  type: z.enum(types, { message: "Choose a viewing or a test drive." }),
  status: z.enum(statuses, { message: "Choose a status." }),
  startsAt: z.string().max(40),
  durationMinutes: z.number().int().min(5, "Choose how long it takes.").max(600),
  vehicleId: z.string().max(64).nullable(),
  customerId: z.string().max(64).nullable().default(null),
  customerName: z.string().max(120, "Keep the name under 120 characters."),
  customerPhone: z.string().trim().max(30).nullable().default(null),
  enquiryId: z.string().max(64).nullable().default(null),
  handledBy: z.string().max(64).nullable().default(null),
  notes: z.string().max(2000, "Keep notes under 2,000 characters.").default(""),
  checks: z
    .object({ licenceSeen: z.boolean(), insuranceConfirmed: z.boolean() })
    .default({ licenceSeen: false, insuranceConfirmed: false }),
});

const updateSchema = inputSchema.extend({ expectedUpdatedAt: z.string().min(1) });
const idParam = z.object({ id: z.string().min(1).max(64) });

async function exists(executor: Executor, table: typeof lead | typeof customer | typeof tables.vehicle, id: string) {
  const [row] = await executor.select({ id: table.id }).from(table).where(eq(table.id, id)).limit(1);
  return !!row;
}

/** Everything the contract requires of an appointment, as field messages. */
async function validateInput(executor: Executor, input: AppointmentInput): Promise<void> {
  const fields: Record<string, string> = {};
  if (!input.customerName.trim()) fields.customerName = "Add the customer's name.";
  if (Number.isNaN(Date.parse(input.startsAt))) fields.startsAt = "Choose a date and time.";
  if (!input.vehicleId) fields.vehicleId = "Choose the car.";
  else if (!(await exists(executor, tables.vehicle, input.vehicleId))) fields.vehicleId = "That car no longer exists.";
  if (input.customerPhone && input.customerPhone.replace(/\D/g, "").length < 10) fields.customerPhone = "Enter a valid UK phone number.";
  if (input.customerId && !(await exists(executor, customer, input.customerId))) fields.customerId = "That customer no longer exists.";
  if (input.enquiryId && !(await exists(executor, lead, input.enquiryId))) fields.enquiryId = "That enquiry no longer exists.";
  if (input.handledBy) {
    const [member] = await executor.select({ status: user.status }).from(user).where(eq(user.id, input.handledBy)).limit(1);
    if (member?.status !== "active") fields.handledBy = "Choose an active member of the team.";
  }
  if (Object.keys(fields).length) throw new ValidationError(fields);
}

function columns(input: AppointmentInput) {
  return {
    type: input.type,
    status: input.status,
    startsAt: new Date(input.startsAt),
    durationMinutes: input.durationMinutes,
    vehicleId: input.vehicleId,
    customerId: input.customerId,
    customerName: input.customerName.trim(),
    customerPhone: input.customerPhone || null,
    enquiryId: input.enquiryId,
    handledBy: input.handledBy,
    notes: input.notes,
    checks: input.checks,
  };
}

/** Arranging a viewing moves an open enquiry along; it never reopens a closed one. */
async function noteOnEnquiry(tx: Executor, row: AppointmentRow, member: SessionUser) {
  if (!row.enquiryId) return;
  const [enquiry] = await tx.select().from(lead).where(eq(lead.id, row.enquiryId)).limit(1);
  if (!enquiry) return;

  const when = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(row.startsAt);
  await logActivity(tx, enquiry.id, member, "appointment", `${row.type === "test-drive" ? "Test drive" : "Viewing"} arranged for ${when}.`);

  const status = enquiry.status as EnquiryStatus;
  const advance = status === "new" || status === "contacted";
  if (advance) {
    await logActivity(tx, enquiry.id, member, "status", `Status changed from ${enquiryStatusLabel(status)} to Viewing arranged.`);
  }
  await tx
    .update(lead)
    .set({
      status: advance ? "viewing-arranged" : status,
      firstRepliedAt: enquiry.firstRepliedAt ?? (status === "new" ? new Date() : null),
      updatedAt: stamp(enquiry.updatedAt),
    })
    .where(eq(lead.id, enquiry.id));
}

async function present(row: AppointmentRow): Promise<Appointment> {
  const [vehicles, leads] = await Promise.all([listVehicles(), loadLeads()]);
  return toAppointment(row, vehicles, leads);
}

export const appointmentRoutes = new Hono<AdminEnv>()
  .get("/", validate("query", listQuery), async (c) => {
    const query = c.req.valid("query");
    const from = query.from ? Date.parse(query.from) : null;
    const to = query.to ? Date.parse(query.to) : null;
    const [rows, vehicles, leads] = await Promise.all([loadAppointments(), listVehicles(), loadLeads()]);
    const items = rows.filter((row) => {
      const starts = row.startsAt.getTime();
      if (from !== null && starts < from) return false;
      if (to !== null && starts >= to) return false;
      if (query.status === "active" && row.status !== "requested" && row.status !== "confirmed") return false;
      if (query.status && query.status !== "active" && query.status !== "all" && row.status !== query.status) return false;
      if (query.type && query.type !== "all" && row.type !== query.type) return false;
      if (query.vehicleId && row.vehicleId !== query.vehicleId) return false;
      if (query.customerId && row.customerId !== query.customerId) return false;
      return true;
    });
    return c.json(items.map((row) => toAppointment(row, vehicles, leads)) satisfies Appointment[]);
  })

  .post("/", validate("json", inputSchema), async (c) => {
    const member = requireCapability(c, "appointments.edit");
    const input = c.req.valid("json");

    const row = await db.transaction(async (tx) => {
      await validateInput(tx, input);
      const now = new Date();
      const [created] = await tx
        .insert(appointment)
        .values({ id: crypto.randomUUID(), ...columns(input), createdAt: now, updatedAt: now })
        .returning();
      await noteOnEnquiry(tx, created!, member);
      return created!;
    });
    return c.json(await present(row), 201);
  })

  .put("/:id", validate("param", idParam), validate("json", updateSchema), async (c) => {
    requireCapability(c, "appointments.edit");
    const { expectedUpdatedAt, ...input } = c.req.valid("json");

    const row = await db.transaction(async (tx) => {
      const [current] = await tx.select().from(appointment).where(eq(appointment.id, c.req.valid("param").id)).for("update").limit(1);
      if (!current) throw new NotFoundError("This appointment could not be found.");
      checkVersion(current.updatedAt, expectedUpdatedAt);
      await validateInput(tx, input);
      const [updated] = await tx
        .update(appointment)
        .set({ ...columns(input), updatedAt: stamp(current.updatedAt) })
        .where(eq(appointment.id, current.id))
        .returning();
      return updated!;
    });
    return c.json(await present(row));
  });
