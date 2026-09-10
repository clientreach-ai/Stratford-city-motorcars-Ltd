import { JsonLd } from "@/components/ui/json-ld";
import { RevealObserver } from "@/components/ui/reveal";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { autoDealerSchema } from "@/lib/seo";

/**
 * Chrome for the public site. The admin routes live in `(admin)` and
 * deliberately get none of this.
 *
 * The AutoDealer graph is emitted once here rather than per page, and every
 * vehicle offer references it by @id so search engines connect stock to seller.
 */
export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <JsonLd data={autoDealerSchema()} />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:bg-ink-950 focus:px-5 focus:py-3 focus:text-sm focus:text-bone"
      >
        Skip to content
      </a>

      <div className="flex min-h-dvh flex-col">
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </div>

      <RevealObserver />
    </>
  );
}
