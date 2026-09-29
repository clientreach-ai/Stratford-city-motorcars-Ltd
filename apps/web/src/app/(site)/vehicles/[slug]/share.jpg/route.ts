import { getVehicleBySlug } from "@/lib/inventory/repository";
import { readDefaultShareImage, renderShareImage } from "@/lib/media/share-image";
import { SHARE_IMAGE } from "@/lib/seo";

/**
 * A car's link-preview image: its cover photograph as a 1200×630 JPEG (see
 * lib/media/share-image.ts). The page's metadata links here with the cover's
 * id as `?v=`.
 *
 * A photograph never changes once stored, so the image for the current cover
 * is cached as immutable for a year, by browsers and the CDN alike. Any other
 * `v` — an old cover, or one made up — is redirected to the current image
 * rather than rendered, so arbitrary values can't make the server resize
 * photographs on demand. The site-wide stand-in for a photograph that could
 * not be read is cached only briefly, so it isn't pinned.
 */

const IMMUTABLE = "public, max-age=31536000, immutable";
const BRIEF = "public, max-age=300";

function jpeg(bytes: Buffer, cacheControl: string): Response {
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": SHARE_IMAGE.type,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": cacheControl,
      "Vercel-CDN-Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const vehicle = await getVehicleBySlug(slug);
  if (!vehicle) return new Response("Not found", { status: 404 });

  if (new URL(request.url).searchParams.get("v") !== vehicle.cover.id) {
    const location = `/vehicles/${vehicle.slug}/share.jpg?v=${encodeURIComponent(vehicle.cover.id)}`;
    return new Response(null, { status: 307, headers: { Location: location, "Cache-Control": BRIEF } });
  }

  const image = await renderShareImage(vehicle.cover);
  if (image) return jpeg(image, IMMUTABLE);

  // The same size and type, so the dimensions in the page's metadata still hold.
  const fallback = await readDefaultShareImage();
  if (fallback) return jpeg(fallback, BRIEF);
  return Response.redirect(new URL("/brand/og-default.jpg", request.url), 307);
}
