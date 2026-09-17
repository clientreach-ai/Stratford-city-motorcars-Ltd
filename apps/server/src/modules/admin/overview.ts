import type { Overview, OverviewListing } from "@Stratford-city-motorcars-Ltd/core/overview";
import { listingProgress } from "@Stratford-city-motorcars-Ltd/core/stock";
import { Hono } from "hono";

import { listVehicles } from "../vehicles/repository";
import type { AdminEnv } from "./context";
import { loadAppointments, loadLeads, toAppointment, toEnquiry } from "./data";
import { countEnquiries } from "./enquiries";

/**
 *   GET /api/admin/overview
 *
 * Computed from stored records only; there is no visitor tracking. "Today" is
 * the calendar day in Europe/London.
 */

const MINUTE = 60_000;
const DAY = 86_400_000;

const londonDay = (value: Date | string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date(value));

export const overviewRoutes = new Hono<AdminEnv>().get("/", async (c) => {
  const [vehicles, leads, appointmentRows] = await Promise.all([listVehicles(), loadLeads(), loadAppointments()]);
  const now = Date.now();

  const progress = vehicles.map((stored) => ({ record: stored.record, progress: listingProgress(stored.record) }));
  const listing = ({ record, progress: p }: (typeof progress)[number]): OverviewListing => ({
    id: record.id,
    title: record.title,
    year: record.year,
    status: record.status,
    coverSrc: p.cover?.src ?? null,
    dealerPhotos: p.dealerPhotos,
    hasVideo: p.hasVideo,
    issues: p.issues,
    recommendationCount: p.recommendations.length,
  });

  const live = progress.filter((item) => item.record.status === "published" && item.progress.live);
  const drafts = progress.filter((item) => item.record.status === "draft");
  const priced = live.filter((item) => !item.record.priceOnApplication && item.record.price !== null);

  const enquiries = leads.map((row) => toEnquiry(row, vehicles));
  const today = londonDay(new Date(now));
  const active = appointmentRows
    .filter((row) => row.status === "requested" || row.status === "confirmed")
    .map((row) => toAppointment(row, vehicles, leads));

  const overview: Overview = {
    generatedAt: new Date(now).toISOString(),
    stock: {
      live: live.length,
      drafts: drafts.length,
      readyToPublish: drafts.filter((item) => item.progress.issues.length === 0).length,
      reserved: live.filter((item) => item.record.reserved).length,
      featured: live.filter((item) => item.record.featured).length,
      soldRecently: vehicles.filter(
        (item) => item.record.status === "sold" && item.record.soldAt && now - new Date(item.record.soldAt).getTime() < 30 * DAY,
      ).length,
      stockValue: priced.reduce((sum, item) => sum + (item.record.price ?? 0), 0),
      poaCount: live.length - priced.length,
      withheld: progress.filter((item) => item.progress.withheld).map(listing),
      needsWork: progress
        .filter(
          (item) =>
            (item.record.status === "draft" || item.record.status === "published") &&
            (item.progress.issues.length > 0 || item.progress.recommendations.length > 0),
        )
        .sort(
          (a, b) =>
            b.progress.issues.length - a.progress.issues.length || a.progress.dealerPhotos - b.progress.dealerPhotos,
        )
        .slice(0, 6)
        .map(listing),
    },
    enquiries: {
      ...countEnquiries(enquiries),
      needsReply: enquiries
        .filter((item) => item.status === "new")
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .slice(0, 6),
      recent: [...enquiries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6),
      awaitingValuation: enquiries.filter((item) => item.valuation?.status === "awaiting").length,
    },
    appointments: {
      today: active.filter((item) => londonDay(item.startsAt) === today),
      upcoming: active
        .filter((item) => londonDay(item.startsAt) > today && new Date(item.startsAt).getTime() < now + 8 * DAY)
        .slice(0, 6),
      toConfirm: active.filter((item) => item.status === "requested" && new Date(item.startsAt).getTime() > now - 30 * MINUTE).length,
    },
  };

  c.header("Cache-Control", "no-store");
  return c.json(overview);
});
