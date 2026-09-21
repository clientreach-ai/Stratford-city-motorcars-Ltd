import { getSite } from "@/lib/settings";
import { PageTransition } from "@/components/ui/page-transition";
import { RevealObserver } from "@/components/ui/reveal";
import { SmoothScroll } from "@/components/ui/smooth-scroll";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

/**
 * The public site's frame: skip link, header, main landmark, footer. Used by
 * the `(site)` layout and by the global 404, which renders outside that layout.
 */
export async function SiteChrome({ children }: { children: React.ReactNode }) {
  // The owner's saved business details, read once for the whole page.
  const site = await getSite();

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:bg-ink-950 focus:px-5 focus:py-3 focus:text-sm focus:text-bone"
      >
        Skip to content
      </a>

      <div className="flex min-h-dvh flex-col">
        <SiteHeader site={site} />
        <main id="main" className="flex-1">
          <PageTransition>{children}</PageTransition>
        </main>
        <SiteFooter />
      </div>

      <RevealObserver />
      <SmoothScroll />
    </>
  );
}
