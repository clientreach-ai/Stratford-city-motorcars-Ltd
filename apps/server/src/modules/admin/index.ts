import { Hono } from "hono";

import type { AppEnv } from "../../types";
import { appointmentRoutes } from "./appointments";
import { requireMember, type AdminEnv } from "./context";
import { customerRoutes } from "./customers";
import { enquiryRoutes } from "./enquiries";
import { overviewRoutes } from "./overview";
import { sessionRoutes } from "./session";
import { settingsRoutes } from "./settings";
import { stockRoutes } from "./stock";
import { invitationRoutes, teamRoutes } from "./team";

/**
 * The admin API — everything apps/admin calls, under /api/admin.
 * docs/STRATFORD_ADMIN_CONTRACT.md is the specification; the client is
 * apps/admin/src/lib/api/http.ts.
 *
 *   /session                     sign in / out, who am I        (no member needed)
 *   /invitations/:token          accept a team invitation        (no member needed)
 *   /overview                    dashboard figures
 *   /vehicles                    stock and photographs
 *   /enquiries                   enquiries, notes, valuations
 *   /appointments                viewings and test drives
 *   /customers                   customers
 *   /team                        members and invitations
 *   /settings                    business details
 */

const members = new Hono<AdminEnv>()
  .use(requireMember)
  .use(async (c, next) => {
    await next();
    if (!c.res.headers.has("Cache-Control")) c.header("Cache-Control", "no-store");
  })
  .route("/overview", overviewRoutes)
  .route("/vehicles", stockRoutes)
  .route("/enquiries", enquiryRoutes)
  .route("/appointments", appointmentRoutes)
  .route("/customers", customerRoutes)
  .route("/team", teamRoutes)
  .route("/settings", settingsRoutes);

export const adminRoutes = new Hono<AppEnv>()
  .route("/session", sessionRoutes)
  .route("/invitations", invitationRoutes)
  .route("/", members as unknown as Hono<AppEnv>);
