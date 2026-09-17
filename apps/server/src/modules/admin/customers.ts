import { emailKey, eq, phoneKey, tables } from "@Stratford-city-motorcars-Ltd/db";
import type { Customer, CustomerDetail } from "@Stratford-city-motorcars-Ltd/core/customer";
import { NotFoundError, ValidationError } from "@Stratford-city-motorcars-Ltd/core/errors";
import { DEFAULT_PAGE_SIZE, type Page } from "@Stratford-city-motorcars-Ltd/core/list";
import { can } from "@Stratford-city-motorcars-Ltd/core/permissions";
import { Hono } from "hono";
import { z } from "zod";

import { db } from "../../lib/db";
import { validate } from "../../lib/validation";
import { listVehicles } from "../vehicles/repository";
import { checkVersion, requireCapability, stamp, type AdminEnv } from "./context";
import { loadAppointments, loadCustomers, loadLeads, matches, toAppointment, toCustomer, toEnquiry } from "./data";
import { paginate } from "./enquiries";

/**
 * Customers — people grouped from their enquiries (see packages/db
 * `recordWebsiteEnquiry`). Holds personal data; responses are never cached.
 */

const { customer } = tables;

const listQuery = z.object({
  search: z.string().max(200).optional(),
  filter: z.enum(["all", "open-enquiries", "buyers"]).optional(),
  sort: z.enum(["recent", "name"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(DEFAULT_PAGE_SIZE),
});

const idParam = z.object({ id: z.string().min(1).max(64) });

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const updateBody = z.object({
  name: z.string().max(120, "Keep the name under 120 characters."),
  email: z.string().max(160).nullable(),
  phone: z.string().max(30).nullable(),
  notes: z.string().max(4000, "Keep notes under 4,000 characters."),
  expectedUpdatedAt: z.string().min(1),
});

export const customerRoutes = new Hono<AdminEnv>()
  .use(async (c, next) => {
    await next();
    c.header("Cache-Control", "no-store");
  })

  .get("/", validate("query", listQuery), async (c) => {
    const query = c.req.valid("query");
    const [rows, leads, appointments, vehicles] = await Promise.all([loadCustomers(), loadLeads(), loadAppointments(), listVehicles()]);
    const items = rows
      .map((row) => toCustomer(row, leads, appointments, vehicles))
      .filter((item) => {
        if (query.filter === "open-enquiries" && item.openEnquiryCount === 0) return false;
        if (query.filter === "buyers" && item.purchaseCount === 0) return false;
        return matches(query.search ?? "", item.name, item.email, item.phone);
      })
      .sort((a, b) => (query.sort === "name" ? a.name.localeCompare(b.name) : b.lastActivityAt.localeCompare(a.lastActivityAt)));
    return c.json(paginate(items, query.page, query.pageSize) satisfies Page<Customer>);
  })

  .get("/:id", validate("param", idParam), async (c) => {
    const { id } = c.req.valid("param");
    const [rows, leads, appointments, vehicles] = await Promise.all([loadCustomers(), loadLeads(), loadAppointments(), listVehicles()]);
    const row = rows.find((item) => item.id === id);
    if (!row) throw new NotFoundError("This customer could not be found.");
    const seePrices = can(c.get("member").role, "stock.salePrice");

    return c.json({
      customer: toCustomer(row, leads, appointments, vehicles),
      enquiries: leads
        .filter((item) => item.customerId === id)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((item) => toEnquiry(item, vehicles)),
      appointments: appointments
        .filter((item) => item.customerId === id)
        .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())
        .map((item) => toAppointment(item, vehicles, leads)),
      purchases: vehicles
        .filter((item) => item.sale?.customerId === id)
        .map((item) => ({
          vehicleId: item.record.id,
          title: item.record.title,
          year: item.record.year,
          soldAt: item.sale!.soldAt,
          salePrice: seePrices ? item.sale!.salePrice : null,
        })),
    } satisfies CustomerDetail);
  })

  .put("/:id", validate("param", idParam), validate("json", updateBody), async (c) => {
    requireCapability(c, "customers.edit");
    const input = c.req.valid("json");
    const name = input.name.trim();
    const email = input.email?.trim() || null;
    const phone = input.phone?.trim() || null;

    const fields: Record<string, string> = {};
    if (name.length < 2) fields.name = "Add the customer's name.";
    if (email && !EMAIL.test(email)) fields.email = "That doesn't look like an email address.";
    if (phone && phone.replace(/\D/g, "").length < 10) fields.phone = "Enter a valid UK phone number.";
    if (!email && !phone) fields.phone = "Keep at least one way to contact them.";
    if (Object.keys(fields).length) throw new ValidationError(fields);

    await db.transaction(async (tx) => {
      const [current] = await tx.select().from(customer).where(eq(customer.id, c.req.valid("param").id)).for("update").limit(1);
      if (!current) throw new NotFoundError("This customer could not be found.");
      checkVersion(current.updatedAt, input.expectedUpdatedAt);
      await tx
        .update(customer)
        .set({ name, email, phone, emailKey: emailKey(email), phoneKey: phoneKey(phone), notes: input.notes, updatedAt: stamp(current.updatedAt) })
        .where(eq(customer.id, current.id));
    });

    const [rows, leads, appointments, vehicles] = await Promise.all([loadCustomers(), loadLeads(), loadAppointments(), listVehicles()]);
    const row = rows.find((item) => item.id === c.req.valid("param").id)!;
    return c.json(toCustomer(row, leads, appointments, vehicles) satisfies Customer);
  });
