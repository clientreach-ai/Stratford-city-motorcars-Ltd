import { resolvePreviousSlug } from "@/lib/inventory/repository";

/**
 * Legacy vehicle URLs from the previous site, `/sales/<slug>`.
 *
 * The rebuild uses different slugs (e.g. `/sales/rolls-royce-dawn` →
 * `/vehicles/rolls-royce-dawn-2016`). Each record keeps its old slugs in
 * `previousSlugs`, so a legacy link lands on the car's current page when that
 * car is on the site, and on the stock page otherwise — never on a 404 for a
 * car that is simply not listed right now.
 */
export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const current = /^[a-z0-9-]{1,160}$/.test(slug) ? await resolvePreviousSlug(slug) : null;
  // A relative Location, like Next's own redirects: correct behind any proxy.
  return new Response(null, {
    status: 308,
    headers: { Location: current ? `/vehicles/${current}` : "/vehicles" },
  });
}
