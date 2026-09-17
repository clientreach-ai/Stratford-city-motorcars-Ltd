import { eq, tables } from "@Stratford-city-motorcars-Ltd/db";
import { ConflictError, ForbiddenError, UnauthorisedError } from "@Stratford-city-motorcars-Ltd/core/errors";
import { can, deniedReason, type Capability } from "@Stratford-city-motorcars-Ltd/core/permissions";
import type { Role, SessionUser } from "@Stratford-city-motorcars-Ltd/core/team";
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";

import { db } from "../../lib/db";
import type { AppEnv } from "../../types";

/**
 * Who is calling and what they may do. Every admin route runs behind
 * `requireMember`; every write calls `requireCapability`. The admin's own
 * `can()` only hides buttons — this is the protection.
 */

export interface AdminEnv {
  Variables: AppEnv["Variables"] & { member: SessionUser };
}

export type AdminContext = Context<AdminEnv>;

export function toRole(value: unknown): Role {
  return value === "owner" ? "owner" : "staff";
}

const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

/** A signed-in, active team member. Anyone else gets 401. */
export const requireMember = createMiddleware<AdminEnv>(async (c, next) => {
  const user = c.get("user") as (NonNullable<AppEnv["Variables"]["user"]> & { role?: unknown; status?: unknown; lastActiveAt?: Date | null }) | null;
  if (!user || user.status !== "active") throw new UnauthorisedError();

  c.set("member", { id: user.id, name: user.name, email: user.email, role: toRole(user.role) });

  // "Last active" for the team page, written at most every five minutes.
  const last = user.lastActiveAt ? new Date(user.lastActiveAt).getTime() : 0;
  if (Date.now() - last > TOUCH_INTERVAL_MS) {
    db.update(tables.user)
      .set({ lastActiveAt: new Date() })
      .where(eq(tables.user.id, user.id))
      .catch(() => undefined);
  }

  await next();
});

export function requireCapability(c: AdminContext, capability: Capability): SessionUser {
  const member = c.get("member");
  if (!can(member.role, capability)) throw new ForbiddenError(deniedReason(capability), capability);
  return member;
}

/** A timestamp strictly after `previous`, so two quick saves never share a version. */
export function stamp(previous?: string | Date | null): Date {
  const last = previous ? new Date(previous).getTime() : 0;
  return new Date(Math.max(Date.now(), last + 1));
}

export function checkVersion(current: string | Date, expected: string | undefined): void {
  const currentIso = new Date(current).toISOString();
  if (!expected || new Date(expected).getTime() !== new Date(currentIso).getTime()) {
    throw new ConflictError(undefined, currentIso);
  }
}
