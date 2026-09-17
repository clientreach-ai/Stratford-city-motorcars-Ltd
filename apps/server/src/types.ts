import type { Session } from "@Stratford-city-motorcars-Ltd/auth";

export type AuthUser = Session["user"];
export type AuthSession = Session["session"];

/** Hono context typing shared by every router. */
export interface AppEnv {
  Variables: {
    requestId: string;
    /** Set by `loadSession` on every request; null when signed out. */
    user: AuthUser | null;
    session: AuthSession | null;
  };
}

/** Context after `requireStaff` has run: a signed-in user is guaranteed. */
export interface StaffEnv {
  Variables: AppEnv["Variables"] & {
    user: AuthUser;
    session: AuthSession;
  };
}
