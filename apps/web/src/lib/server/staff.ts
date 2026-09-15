import "server-only";

import type { Auth } from "@Stratford-city-motorcars-Ltd/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Staff session helpers for the dashboard.
 *
 * Every dashboard page, server action and API route must call `requireStaff()`
 * (or `getStaffSession()` and refuse) itself. Server actions are public POST
 * endpoints; hiding a button is not access control.
 */

export interface DashboardSetup {
  ready: boolean;
  /** Environment variables still needed, named for whoever deploys the site. */
  missing: string[];
}

export function dashboardSetup(): DashboardSetup {
  const missing: string[] = [];
  if (!process.env.DATABASE_URL?.trim()) missing.push("DATABASE_URL");
  if ((process.env.BETTER_AUTH_SECRET?.trim().length ?? 0) < 32) missing.push("BETTER_AUTH_SECRET");
  if (!process.env.BETTER_AUTH_URL?.trim()) missing.push("BETTER_AUTH_URL");
  return { ready: missing.length === 0, missing };
}

/** The auth instance, or null when the dashboard is not configured. */
export async function getStaffAuth(): Promise<Auth | null> {
  if (!dashboardSetup().ready) return null;
  const { getAuth } = await import("@Stratford-city-motorcars-Ltd/auth");
  return getAuth();
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
}

export async function getStaffSession(): Promise<StaffUser | null> {
  const auth = await getStaffAuth();
  if (!auth) return null;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  return { id: session.user.id, name: session.user.name, email: session.user.email };
}

/** For pages and server actions: the signed-in staff member, or a redirect to sign in. */
export async function requireStaff(): Promise<StaffUser> {
  const user = await getStaffSession();
  if (!user) redirect("/login");
  return user;
}
