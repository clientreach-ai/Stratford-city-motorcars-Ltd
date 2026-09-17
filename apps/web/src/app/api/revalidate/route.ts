import { timingSafeEqual } from "node:crypto";

import { revalidateTag } from "next/cache";

import { INVENTORY_CACHE_TAG } from "@/lib/inventory/repository";
import { SETTINGS_CACHE_TAG } from "@/lib/settings";

/**
 * Called by the API server after staff change stock, so the edit shows on the
 * next page view instead of when the five-minute cache expires.
 *
 *   POST /api/revalidate   Authorization: Bearer <REVALIDATE_SECRET>
 *                          { "tag": "inventory" | "settings" }
 *
 * An unknown or missing tag refreshes stock, as the first version did.
 *
 * Disabled (404) unless REVALIDATE_SECRET is set.
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET?.trim();
  if (!secret) return new Response(null, { status: 404 });

  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!safeEqual(supplied, secret)) return Response.json({ ok: false }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { tag?: unknown };
  const tag = body.tag === SETTINGS_CACHE_TAG ? SETTINGS_CACHE_TAG : INVENTORY_CACHE_TAG;
  revalidateTag(tag, { expire: 0 });
  return Response.json({ ok: true, tag }, { headers: { "Cache-Control": "no-store" } });
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
