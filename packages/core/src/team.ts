/**
 * The people who sign in to the admin.
 *
 * A small family business: an owner, and possibly members of staff. Roles are
 * decided by the API from the session and enforced there on every request —
 * see `permissions.ts`. Nothing in the admin's interface is the protection.
 */

export const ROLES = [
  {
    value: "owner",
    label: "Owner",
    summary: "Everything, including the team, settings, archiving cars and sale prices.",
  },
  {
    value: "staff",
    label: "Staff",
    summary: "Stock, enquiries, viewings and customers. No team, settings, archiving or sale prices.",
  },
] as const satisfies readonly { value: string; label: string; summary: string }[];

export type Role = (typeof ROLES)[number]["value"];

/**
 *  - `invited`      an invitation was sent and has not been accepted
 *  - `active`       can sign in
 *  - `deactivated`  can no longer sign in; kept so their history keeps a name
 */
export const MEMBER_STATUSES = [
  { value: "active", label: "Active" },
  { value: "invited", label: "Invited" },
  { value: "deactivated", label: "Deactivated" },
] as const;

export type MemberStatus = (typeof MEMBER_STATUSES)[number]["value"];

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: MemberStatus;
  /** ISO. */
  createdAt: string;
  /** ISO. Null until they first sign in. */
  lastActiveAt: string | null;
}

/** Who is signed in, as the API reports it. */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

/** Passwords set by the owner or chosen by a member: 12 to 128 characters. */
export const PASSWORD_LENGTH = { min: 12, max: 128 } as const;

export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_LENGTH.min) return `Use at least ${PASSWORD_LENGTH.min} characters.`;
  if (password.length > PASSWORD_LENGTH.max) return `Use at most ${PASSWORD_LENGTH.max} characters.`;
  return null;
}

/**
 * A new account created by the owner. It is active at once and signs in with
 * this email and password; the owner passes them on. No email is sent.
 */
export interface InviteMemberInput {
  name: string;
  email: string;
  role: Role;
  password: string;
}

export interface UpdateMemberInput {
  role?: Role;
  status?: Extract<MemberStatus, "active" | "deactivated">;
  /**
   * A new password set by the owner. Ends the member's other sessions, and
   * activates a member who was still `invited`.
   */
  password?: string;
}
