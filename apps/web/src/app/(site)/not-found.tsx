import { Phone } from "lucide-react";

import { ButtonLink, ExternalButtonLink } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/icons";
import { Container, Eyebrow } from "@/components/ui/section";
import { site } from "@/lib/site";
import { whatsappLinks } from "@/lib/whatsapp";

/**
 * Cars sell and listings disappear, so a 404 here is a normal event rather
 * than an error — it should route the visitor back to stock, not apologise.
 */
export default function NotFound() {
  return (
    <section data-surface="dark" className="bg-ink-950 text-bone">
      <Container className="flex min-h-[70vh] flex-col items-center justify-center py-24 text-center">
        <Eyebrow>Page not found</Eyebrow>

        <p
          aria-hidden
          data-numeric
          className="mt-8 font-display text-[clamp(5rem,18vw,11rem)] leading-none text-bone/12"
        >
          404
        </p>

        <h1 className="mt-2 text-[clamp(1.75rem,4vw,2.75rem)] leading-tight">
          This one&rsquo;s not here
        </h1>

        <p className="mx-auto mt-5 max-w-md leading-relaxed text-bone/55">
          The page may have moved, or the car may have sold. Either way, the rest
          of the stock is a click away — or tell us what you&rsquo;re after and
          we&rsquo;ll find it.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/vehicles" size="lg">
            View our stock
          </ButtonLink>
          <ExternalButtonLink
            href={whatsappLinks.sourcing}
            target="_blank"
            rel="noopener noreferrer"
            variant="whatsapp"
            size="lg"
          >
            <WhatsAppIcon className="size-4" />
            Tell us what you want
          </ExternalButtonLink>
          <ExternalButtonLink href={site.phone.href} variant="outline" size="lg">
            <Phone className="size-4" />
            {site.phone.display}
          </ExternalButtonLink>
        </div>
      </Container>
    </section>
  );
}
