import { and, eq, inArray, ne, tables } from "@Stratford-city-motorcars-Ltd/db";
import { OPEN_ENQUIRY_STATUSES } from "@Stratford-city-motorcars-Ltd/core/enquiry";
import { NotFoundError, ValidationError } from "@Stratford-city-motorcars-Ltd/core/errors";
import { PASSWORD_LENGTH, passwordProblem, type TeamMember } from "@Stratford-city-motorcars-Ltd/core/team";
import { env } from "@Stratford-city-motorcars-Ltd/env/server";
import { hashPassword } from "better-auth/crypto";
import { Hono } from "hono";
import { z } from "zod";

import { db } from "../../lib/db";
import { sendEmail } from "../../lib/email";
import { HttpError } from "../../lib/http";
import { createRateLimiter } from "../../lib/rate-limit";
import { validate } from "../../lib/validation";
import type { AppEnv } from "../../types";
import { requireCapability, stamp, type AdminEnv } from "./context";
import { loadMembers, logActivity, toMember, type Executor } from "./data";

/**
 * The team — see "Team" in docs/STRATFORD_ADMIN_CONTRACT.md.
 *
 * The owner creates accounts directly (name, email, role and a password)
 * and passes the details on; the account is active at once and no email is
 * sent. The owner can set a new password for anyone later. Members created by
 * the older invitation flow can still accept their link at /accept-invitation.
 * There must always be one active owner.
 */

const { user, session, account, lead, teamInvitation } = tables;

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const password = z.string().max(PASSWORD_LENGTH.max, `Use at most ${PASSWORD_LENGTH.max} characters.`);

const inviteBody = z.object({
  name: z.string().max(120, "Keep the name under 120 characters."),
  email: z.string().max(160),
  role: z.enum(["owner", "staff"]),
  password,
});

const updateBody = z.object({
  role: z.enum(["owner", "staff"]).optional(),
  status: z.enum(["active", "deactivated"]).optional(),
  password: password.optional(),
});

/** Creates or replaces the member's email-and-password login. */
async function setCredential(executor: Executor, userId: string, plain: string): Promise<void> {
  const hashed = await hashPassword(plain);
  const now = new Date();
  const [existing] = await executor
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
    .limit(1);
  if (existing) {
    await executor.update(account).set({ password: hashed, updatedAt: now }).where(eq(account.id, existing.id));
  } else {
    await executor.insert(account).values({
      id: crypto.randomUUID(),
      issuer: "local:credential",
      accountId: userId,
      providerId: "credential",
      userId,
      password: hashed,
      createdAt: now,
      updatedAt: now,
    });
  }
}

const idParam = z.object({ id: z.string().min(1).max(64) });

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Buffer.from(digest).toString("hex");
}

/** Replaces any earlier invitation for this member with a new link, and emails it. */
async function issueInvitation(executor: Executor, member: { id: string; name: string; email: string }, invitedBy: string) {
  const token = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
  await executor.delete(teamInvitation).where(eq(teamInvitation.userId, member.id));
  await executor.insert(teamInvitation).values({
    id: crypto.randomUUID(),
    userId: member.id,
    tokenHash: await sha256(token),
    expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
  });

  const link = `${env.ADMIN_URL.replace(/\/+$/, "")}/accept-invitation?token=${token}`;
  await sendEmail({
    to: member.email,
    subject: "Your Stratford City Motorcars admin invitation",
    text: [
      `Hello ${member.name},`,
      "",
      `${invitedBy} has invited you to the Stratford City Motorcars admin.`,
      "Open this link to choose your password. It works once and expires in 7 days:",
      "",
      link,
      "",
      "If you were not expecting this, you can ignore this email.",
    ].join("\n"),
  });
}

function failSending(): never {
  throw new HttpError(502, "email_failed", "The invitation email could not be sent. Try again, or check the email settings.");
}

export const teamRoutes = new Hono<AdminEnv>()
  .get("/", async (c) => c.json((await loadMembers()) satisfies TeamMember[]))

  .post("/", validate("json", inviteBody), async (c) => {
    requireCapability(c, "team.manage");
    const input = c.req.valid("json");
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();

    const fields: Record<string, string> = {};
    if (name.length < 2) fields.name = "Add their name.";
    if (!EMAIL.test(email)) fields.email = "That doesn't look like an email address.";
    else {
      const [taken] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
      if (taken) fields.email = "Someone on the team already uses this email address.";
    }
    const weak = passwordProblem(input.password);
    if (weak) fields.password = weak;
    if (Object.keys(fields).length) throw new ValidationError(fields);

    const member = await db.transaction(async (tx) => {
      const now = new Date();
      const [row] = await tx
        .insert(user)
        .values({ id: crypto.randomUUID(), name, email, emailVerified: true, role: input.role, status: "active", createdAt: now, updatedAt: now })
        .returning();
      await setCredential(tx, row!.id, input.password);
      return toMember(row!);
    });
    return c.json(member, 201);
  })

  .patch("/:id", validate("param", idParam), validate("json", updateBody), async (c) => {
    const actor = requireCapability(c, "team.manage");
    const { id } = c.req.valid("param");
    const input = c.req.valid("json");

    const updated = await db.transaction(async (tx) => {
      const members = await loadMembers(tx);
      const member = members.find((item) => item.id === id);
      if (!member) throw new NotFoundError("This person is no longer on the team.");

      if (id === actor.id && input.status === "deactivated") {
        throw new ValidationError({}, "You cannot deactivate your own account.");
      }
      if (input.password !== undefined) {
        const weak = passwordProblem(input.password);
        if (weak) throw new ValidationError({ password: weak });
      }
      if (member.status === "invited" && input.status === "active" && input.password === undefined) {
        throw new ValidationError({}, "Set a password for them first; that makes the account active.");
      }
      const { password: newPassword, ...changes } = input;
      const next = {
        ...member,
        ...changes,
        // Setting a password is what activates an invited member.
        status: changes.status ?? (newPassword !== undefined && member.status === "invited" ? "active" : member.status),
      };
      const owners = members.map((item) => (item.id === id ? next : item)).filter((item) => item.role === "owner" && item.status === "active");
      if (owners.length === 0) throw new ValidationError({}, "There must always be at least one active owner.");

      const [row] = await tx
        .update(user)
        .set({ role: next.role, status: next.status, updatedAt: stamp(), ...(newPassword !== undefined ? { emailVerified: true } : {}) })
        .where(eq(user.id, id))
        .returning();

      if (newPassword !== undefined) {
        await setCredential(tx, id, newPassword);
        await tx.delete(teamInvitation).where(eq(teamInvitation.userId, id));
        // Anyone signed in with the old password is signed out, except the
        // owner's own current session when they change their own password.
        const current = c.get("session")?.id;
        await tx
          .delete(session)
          .where(id === actor.id && current ? and(eq(session.userId, id), ne(session.id, current)) : eq(session.userId, id));
      }

      if (input.status === "deactivated" && member.status !== "deactivated") {
        // Signed out everywhere, invitation withdrawn, open enquiries released.
        await tx.delete(session).where(eq(session.userId, id));
        await tx.delete(teamInvitation).where(eq(teamInvitation.userId, id));
        const handled = await tx
          .select({ id: lead.id, updatedAt: lead.updatedAt })
          .from(lead)
          .where(and(eq(lead.handledBy, id), inArray(lead.status, [...OPEN_ENQUIRY_STATUSES])));
        for (const enquiry of handled) {
          await logActivity(tx, enquiry.id, actor, "assigned", `${member.name} was deactivated; no longer assigned.`);
          await tx.update(lead).set({ handledBy: null, updatedAt: stamp(enquiry.updatedAt) }).where(eq(lead.id, enquiry.id));
        }
      }
      return toMember(row!);
    });
    return c.json(updated);
  })

  .post("/:id/invitation", validate("param", idParam), async (c) => {
    const inviter = requireCapability(c, "team.manage");
    const [member] = await db.select().from(user).where(eq(user.id, c.req.valid("param").id)).limit(1);
    if (!member || member.status !== "invited") throw new ValidationError({}, "Only pending invitations can be sent again.");
    await db.transaction((tx) => issueInvitation(tx, member, inviter.name)).catch((error: unknown) => {
      console.error("[team] invitation failed:", error instanceof Error ? error.message : error);
      failSending();
    });
    return c.body(null, 204);
  });

// ---- Accepting an invitation (no session) -------------------------------------------------------

const acceptThrottle = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: "Too many attempts. Wait a few minutes and try again.",
});

const tokenParam = z.object({ token: z.string().min(20).max(100) });
const acceptBody = z.object({
  password: z
    .string()
    .min(PASSWORD_LENGTH.min, `Use at least ${PASSWORD_LENGTH.min} characters.`)
    .max(PASSWORD_LENGTH.max, `Use at most ${PASSWORD_LENGTH.max} characters.`),
});

const INVALID_LINK = "This invitation link is invalid or has expired. Ask the owner to send a new one.";

async function findInvitation(token: string) {
  const [row] = await db
    .select({ invitation: teamInvitation, member: user })
    .from(teamInvitation)
    .innerJoin(user, eq(user.id, teamInvitation.userId))
    .where(eq(teamInvitation.tokenHash, await sha256(token)))
    .limit(1);
  if (!row || row.invitation.usedAt || row.invitation.expiresAt.getTime() < Date.now() || row.member.status !== "invited") {
    throw new HttpError(410, "invitation_invalid", INVALID_LINK);
  }
  return row;
}

/**
 *   GET  /api/admin/invitations/:token          { name, email } for the accept page
 *   POST /api/admin/invitations/:token/accept   { password } → 204; the member can now sign in
 */
export const invitationRoutes = new Hono<AppEnv>()
  .get("/:token", validate("param", tokenParam), async (c) => {
    acceptThrottle(c);
    const { member } = await findInvitation(c.req.valid("param").token);
    c.header("Cache-Control", "no-store");
    return c.json({ name: member.name, email: member.email });
  })

  .post("/:token/accept", validate("param", tokenParam), validate("json", acceptBody), async (c) => {
    acceptThrottle(c);
    const { invitation, member } = await findInvitation(c.req.valid("param").token);
    const now = new Date();

    await db.transaction(async (tx) => {
      await tx.update(teamInvitation).set({ usedAt: now }).where(eq(teamInvitation.id, invitation.id));
      await setCredential(tx, member.id, c.req.valid("json").password);
      await tx.update(user).set({ status: "active", emailVerified: true, updatedAt: now }).where(eq(user.id, member.id));
    });
    return c.body(null, 204);
  });
