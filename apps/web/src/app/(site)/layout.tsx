import { SiteChrome } from "@/components/site/site-chrome";
import { JsonLd } from "@/components/ui/json-ld";
import { dealerGraph } from "@/lib/seo";

/**
 * Chrome for the public site. The admin routes live in `(admin)` and
 * deliberately get none of this.
 *
 * The AutoDealer and WebSite graph is emitted once here rather than per page,
 * and every vehicle offer references the dealer by @id so search engines
 * connect stock to seller.
 */
export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <JsonLd data={dealerGraph()} />
      <SiteChrome>{children}</SiteChrome>
    </>
  );
}
