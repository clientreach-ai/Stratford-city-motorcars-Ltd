import { getStaffAuth } from "@/lib/server/staff";

/**
 * Staff authentication endpoints (sign in, sign out, session), served by the
 * web app itself so the dashboard cookie is first-party. Public sign-up is
 * disabled in the auth configuration.
 *
 * The auth module is loaded per request, so building and serving the public
 * site never requires the database or auth secrets.
 */
async function handle(request: Request): Promise<Response> {
  const auth = await getStaffAuth();
  if (!auth) {
    return Response.json({ message: "The staff dashboard is not configured on this server." }, { status: 503 });
  }
  return auth.handler(request);
}

export { handle as GET, handle as POST };
