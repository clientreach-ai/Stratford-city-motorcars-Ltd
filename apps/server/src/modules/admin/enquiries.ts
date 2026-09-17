import { desc, eq, tables } from "@Stratford-city-motorcars-Ltd/db";
import {
  CLOSED_REASONS,
  ENQUIRY_KINDS,
  ENQUIRY_STATUSES,
  OPEN_ENQUIRY_STATUSES,
  VALUATION_STATUSES,
  enquiryStatusLabel,
  isOpenEnquiry,
  type Enquiry,
  type EnquiryCounts,
  type EnquiryStatus,
} from "@Stratford-city-motorcars-Ltd/core/enquiry";
import { NotFoundError, ValidationError } from "@Stratford-city-motorcars-Ltd/core/errors";
import { DEFAULT_PAGE_SIZE, type Page } from "@Stratford-city-motorcars-Ltd/core/list";
import { Hono } from "hono";
import { z } from "zod";

import { db } from "../../lib/db";
import { validate } from "../../lib/validation";
import { listVehicles } from "../vehicles/repository";
import { checkVersion, requireCapability, stamp, type AdminEnv } from "./context";
import {
  loadAppointments,
  loadLeads,
  logActivity,
  matches,
  toActivity,
  toAppointment,
  toEnquiry,
  type Executor,
  type LeadRow,
} from "./data";

/**
 * Enquiries — see "Enquiries" in docs/STRATFORD_ADMIN_CONTRACT.md.
 * Every change is recorded in the enquiry's activity, with its author.
 */

const { lead, leadActivity, user } = tables;

const values = <T extends readonly { value: string }[]>(list: T) => list.map((item) => item.value) as [T[number]["value"], ...T[number]["value"][]];

const idParam = z.object({ id: z.string().min(1).max(64) });
const versioned = { expectedUpdatedAt: z.string().min(1, "Reload this enquiry and try again.") };

export const listQuery = z.object({
  status: z.enum([...values(ENQUIRY_STATUSES), "open", "all"]).optional(),
  kind: z.enum([...values(ENQUIRY_KINDS), "all"]).optional(),
  handledBy: z.string().max(64).optional(),
  valuation: z.enum([...values(VALUATION_STATUSES), "all"]).optional(),
  customerId: z.string().max(64).optional(),
  vehicleId: z.string().max(64).optional(),
  search: z.string().max(200).optional(),
  sort: z.enum(["newest", "oldest"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(DEFAULT_PAGE_SIZE),
});
type ListQuery = z.infer<typeof listQuery>;

const statusBody = z.object({
  status: z.enum(values(ENQUIRY_STATUSES)),
  closedReason: z.enum(values(CLOSED_REASONS)).nullable().optional(),
  ...versioned,
});

const handlerBody = z.object({ memberId: z.string().max(64).nullable(), ...versioned });

const noteBody = z.object({
  body: z.string().trim().min(1, "Write a note first.").max(2000, "Keep notes under 2,000 characters."),
});

const valuationBody = z.object({
  status: z.enum(values(VALUATION_STATUSES)),
  amount: z.number().int("Enter the valuation in whole pounds.").min(0).max(10_000_000).nullable(),
  note: z.string().max(1000, "Keep the note under 1,000 characters.").optional(),
  ...versioned,
});

const deleteBody = z.object({ reason: z.enum(["spam", "erasure-request"]) });

// ---- Shared helpers ---------------------------------------------------------------------

export async function loadEnquiries(): Promise<Enquiry[]> {
  const [rows, vehicles] = await Promise.all([loadLeads(), listVehicles()]);
  return rows.map((row) => toEnquiry(row, vehicles));
}

export function filterEnquiries(items: Enquiry[], query: Partial<ListQuery>): Enquiry[] {
  return items.filter((item) => {
    if (query.status === "open" && !isOpenEnquiry(item.status)) return false;
    if (query.status && query.status !== "open" && query.status !== "all" && item.status !== query.status) return false;
    if (query.kind && query.kind !== "all" && item.kind !== query.kind) return false;
    if (query.handledBy === "unassigned" && item.handledBy) return false;
    if (query.handledBy && query.handledBy !== "all" && query.handledBy !== "unassigned" && item.handledBy !== query.handledBy) return false;
    if (query.valuation && query.valuation !== "all" && item.valuation?.status !== query.valuation) return false;
    if (query.customerId && item.customerId !== query.customerId) return false;
    if (query.vehicleId && item.vehicle?.id !== query.vehicleId) return false;
    const exchange = item.payload.kind === "part-exchange" ? `${item.payload.registration} ${item.payload.make} ${item.payload.model}` : "";
    return matches(query.search ?? "", item.name, item.email, item.phone, item.reference, item.vehicle?.title, exchange);
  });
}

export function countEnquiries(items: Enquiry[]): EnquiryCounts {
  const byStatus = { new: 0, contacted: 0, "viewing-arranged": 0, sold: 0, "not-proceeding": 0 } satisfies Record<EnquiryStatus, number>;
  for (const item of items) if (item.status in byStatus) byStatus[item.status] += 1;
  return { byStatus, open: OPEN_ENQUIRY_STATUSES.reduce((sum, status) => sum + byStatus[status], 0), total: items.length };
}

export function paginate<T>(items: T[], page: number, pageSize: number): Page<T> {
  return { items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, pageSize };
}

async function lockLead(tx: Executor, id: string): Promise<LeadRow> {
  const [row] = await (tx as typeof db).select().from(lead).where(eq(lead.id, id)).for("update").limit(1);
  if (!row) throw new NotFoundError("This enquiry could not be found. It may have been deleted.");
  return row;
}

async function present(row: LeadRow): Promise<Enquiry> {
  return toEnquiry(row, await listVehicles());
}

// ---- Routes ----------------------------------------------------------------------------------

export const enquiryRoutes = new Hono<AdminEnv>()
  .use(async (c, next) => {
    await next();
    c.header("Cache-Control", "no-store");
  })

  .get("/", validate("query", listQuery), async (c) => {
    const query = c.req.valid("query");
    const items = filterEnquiries(await loadEnquiries(), query).sort((a, b) =>
      query.sort === "oldest" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt),
    );
    return c.json(paginate(items, query.page, query.pageSize) satisfies Page<Enquiry>);
  })

  .get("/counts", validate("query", listQuery.pick({ kind: true })), async (c) => {
    return c.json(countEnquiries(filterEnquiries(await loadEnquiries(), { kind: c.req.valid("query").kind })));
  })

  .get("/:id", validate("param", idParam), async (c) => {
    const { id } = c.req.valid("param");
    const [row] = await db.select().from(lead).where(eq(lead.id, id)).limit(1);
    if (!row) throw new NotFoundError("This enquiry could not be found. It may have been deleted.");
    const [vehicles, activity, appointments] = await Promise.all([
      listVehicles(),
      db.select().from(leadActivity).where(eq(leadActivity.leadId, id)).orderBy(desc(leadActivity.createdAt)),
      loadAppointments(),
    ]);
    return c.json({
      enquiry: toEnquiry(row, vehicles),
      activity: activity.map(toActivity),
      appointments: appointments
        .filter((item) => item.enquiryId === id)
        .map((item) => toAppointment(item, vehicles, [{ id: row.id, reference: row.reference }])),
    });
  })

  .patch("/:id/status", validate("param", idParam), validate("json", statusBody), async (c) => {
    const member = requireCapability(c, "enquiries.edit");
    const input = c.req.valid("json");
    if (input.status === "not-proceeding" && !input.closedReason) {
      throw new ValidationError({ closedReason: "Choose why this enquiry is not going ahead." });
    }

    const row = await db.transaction(async (tx) => {
      const current = await lockLead(tx, c.req.valid("param").id);
      checkVersion(current.updatedAt, input.expectedUpdatedAt);
      const from = current.status as EnquiryStatus;

      if (input.status !== from) {
        await logActivity(tx, current.id, member, "status", `Status changed from ${enquiryStatusLabel(from)} to ${enquiryStatusLabel(input.status)}.`);
      }
      let handledBy = current.handledBy;
      if (!handledBy && input.status !== "new") {
        handledBy = member.id;
        await logActivity(tx, current.id, member, "assigned", `Assigned to ${member.name}.`);
      }
      const [updated] = await tx
        .update(lead)
        .set({
          status: input.status,
          closedReason: input.status === "not-proceeding" ? (input.closedReason ?? null) : null,
          handledBy,
          firstRepliedAt: current.firstRepliedAt ?? (from === "new" && input.status !== "new" ? new Date() : null),
          updatedAt: stamp(current.updatedAt),
        })
        .where(eq(lead.id, current.id))
        .returning();
      return updated!;
    });
    return c.json(await present(row));
  })

  .patch("/:id/handler", validate("param", idParam), validate("json", handlerBody), async (c) => {
    const member = requireCapability(c, "enquiries.edit");
    const input = c.req.valid("json");

    const row = await db.transaction(async (tx) => {
      const current = await lockLead(tx, c.req.valid("param").id);
      checkVersion(current.updatedAt, input.expectedUpdatedAt);

      let handler: { id: string; name: string } | undefined;
      if (input.memberId) {
        const [found] = await tx
          .select({ id: user.id, name: user.name, status: user.status })
          .from(user)
          .where(eq(user.id, input.memberId))
          .limit(1);
        if (found?.status !== "active") throw new ValidationError({ handledBy: "Choose an active member of the team." });
        handler = found;
      }
      await logActivity(tx, current.id, member, "assigned", handler ? `Assigned to ${handler.name}.` : "No longer assigned to anyone.");
      const [updated] = await tx
        .update(lead)
        .set({ handledBy: handler?.id ?? null, updatedAt: stamp(current.updatedAt) })
        .where(eq(lead.id, current.id))
        .returning();
      return updated!;
    });
    return c.json(await present(row));
  })

  .post("/:id/notes", validate("param", idParam), validate("json", noteBody), async (c) => {
    const member = requireCapability(c, "enquiries.edit");
    const entry = await db.transaction(async (tx) => {
      const current = await lockLead(tx, c.req.valid("param").id);
      const note = await logActivity(tx, current.id, member, "note", c.req.valid("json").body);
      await tx.update(lead).set({ updatedAt: stamp(current.updatedAt) }).where(eq(lead.id, current.id));
      return note;
    });
    return c.json(entry, 201);
  })

  .put("/:id/valuation", validate("param", idParam), validate("json", valuationBody), async (c) => {
    const member = requireCapability(c, "enquiries.edit");
    const input = c.req.valid("json");

    const row = await db.transaction(async (tx) => {
      const current = await lockLead(tx, c.req.valid("param").id);
      checkVersion(current.updatedAt, input.expectedUpdatedAt);
      if (current.kind !== "part-exchange") throw new ValidationError({}, "Only part-exchange enquiries have a valuation.");
      if (input.status !== "awaiting" && (input.amount === null || input.amount <= 0)) {
        throw new ValidationError({ amount: "Enter the valuation in whole pounds." });
      }

      const note = input.note?.trim() || undefined;
      const money = input.amount === null ? "" : ` · £${input.amount.toLocaleString("en-GB")}`;
      await logActivity(tx, current.id, member, "valuation", `Valuation: ${input.status}${money}${note ? ` — ${note}` : ""}`);

      const leavingNew = current.status === "new";
      const [updated] = await tx
        .update(lead)
        .set({
          valuation: { status: input.status, amount: input.amount, note, updatedAt: new Date().toISOString() },
          status: leavingNew ? "contacted" : current.status,
          firstRepliedAt: current.firstRepliedAt ?? (leavingNew ? new Date() : null),
          updatedAt: stamp(current.updatedAt),
        })
        .where(eq(lead.id, current.id))
        .returning();
      return updated!;
    });
    return c.json(await present(row));
  })

  .delete("/:id", validate("param", idParam), validate("json", deleteBody), async (c) => {
    requireCapability(c, "enquiries.delete");
    // Activity is removed with the enquiry (cascade); appointments are unlinked (set null).
    const deleted = await db.delete(lead).where(eq(lead.id, c.req.valid("param").id)).returning({ id: lead.id });
    if (!deleted.length) throw new NotFoundError("This enquiry could not be found. It may have been deleted.");
    return c.body(null, 204);
  });
