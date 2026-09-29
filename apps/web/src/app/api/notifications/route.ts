import { timingSafeEqual } from "node:crypto";

import { configuredNotifiers } from "@/lib/leads/notify";

/**
 * Which enquiry notifications this website sends, for the admin's Settings
 * page. The website, not the API, emails and posts new enquiries, so only it
 * knows what is set up.
 *
 *   GET /api/notifications   Authorization: Bearer <REVALIDATE_SECRET>
 *
 * Channel names only, never addresses or keys. Disabled (404) unless
 * REVALIDATE_SECRET is set, like /api/revalidate.
 */
export async function GET(request: Request) {
  const secret = process.env.REVALIDATE_SECRET?.trim();
  if (!secret) return new Response(null, { status: 404 });

  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!safeEqual(supplied, secret)) return Response.json({ ok: false }, { status: 401 });

  const channels = configuredNotifiers().map((notifier) => notifier.name);
  return Response.json({ channels }, { headers: { "Cache-Control": "no-store" } });
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
