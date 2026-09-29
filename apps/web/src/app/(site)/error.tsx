"use client";

import { useEffect } from "react";
import { Phone, RotateCcw } from "lucide-react";

import { Button, ExternalButtonLink } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/icons";
import { useSite } from "@/components/site/site-provider";
import { Container, Eyebrow } from "@/components/ui/section";
import { whatsappChat } from "@/lib/whatsapp";

/**
 * Shown when a public page fails to render (for example the database is
 * briefly unreachable). A buyer should never meet a blank screen: offer a retry
 * and the two ways the business actually takes enquiries.
 *
 * This boundary sits inside the site layout, so the saved details reach it
 * through `SiteProvider` even when the page below failed. `getSite()` never
 * throws — an unreadable setting falls back to the confirmed facts — so the
 * layout itself does not fail over them.
 */
export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const site = useSite();

  useEffect(() => {
    // The digest links this to the server log without exposing details here.
    console.error("Page failed to render", error.digest ?? "");
  }, [error]);

  return (
    <section data-surface="dark" className="bg-ink-950 text-bone">
      <Container className="flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
        <Eyebrow>Something went wrong</Eyebrow>
        <h1 className="mt-6 text-[clamp(1.75rem,4vw,2.75rem)] leading-tight">This page didn&rsquo;t load</h1>
        <p className="mx-auto mt-5 max-w-md leading-relaxed text-bone/60">
          Please try again. If it keeps happening, call or message us and we&rsquo;ll help straight away.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={reset} size="lg">
            <RotateCcw className="size-4" />
            Try again
          </Button>
          <ExternalButtonLink href={site.phone.href} variant="outline" size="lg">
            <Phone className="size-4" />
            {site.phone.display}
          </ExternalButtonLink>
          <ExternalButtonLink
            href={whatsappChat(site)}
            target="_blank"
            rel="noopener noreferrer"
            variant="whatsapp"
            size="lg"
          >
            <WhatsAppIcon className="size-4" />
            WhatsApp
          </ExternalButtonLink>
        </div>
      </Container>
    </section>
  );
}
