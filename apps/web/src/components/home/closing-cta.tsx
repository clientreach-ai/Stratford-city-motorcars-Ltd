import { ArrowRight, Phone } from "lucide-react";

import { ButtonLink, ExternalButtonLink } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/icons";
import { Container, Eyebrow } from "@/components/ui/section";
import { SplitText } from "@/components/ui/split-text";
import { VehiclePhoto } from "@/components/vehicle/vehicle-photo";
import type { VehicleImage } from "@/lib/inventory/types";
import { site } from "@/lib/site";
import { whatsappLinks } from "@/lib/whatsapp";

/**
 * The last thing on the homepage: one line, three ways in.
 *
 * With stock, one of the dealership's own cars sits deep in the ink behind the
 * words — present, but held well back so it reads as atmosphere rather than
 * a second hero. Without stock it is ink and grain alone.
 */
export function ClosingCta({ photo }: { photo?: VehicleImage }) {
  return (
    <section data-surface="dark" className="grain relative overflow-hidden bg-ink-950 text-bone">
      {photo ? (
        <div aria-hidden className="reveal reveal-image absolute inset-0">
          <VehiclePhoto src={photo.src} alt="" fill sizes="100vw" className="object-cover object-[center_60%] opacity-40" />
          <div className="absolute inset-0 bg-[radial-gradient(90%_75%_at_50%_45%,rgb(10_10_11/0.55)_0%,rgb(10_10_11/0.92)_70%,var(--color-ink-950)_100%)]" />
        </div>
      ) : null}

      <Container className="relative z-10 py-28 text-center md:py-36 lg:py-44">
        <Eyebrow className="reveal justify-center">Ready when you are</Eyebrow>
        <SplitText
          runs={[{ text: "Find your" }, { text: "next car.", tone: "accent" }]}
          className="mx-auto mt-8 max-w-4xl text-[clamp(2.75rem,8vw,6.5rem)] leading-[0.98] tracking-[-0.03em]"
        />
        <p className="reveal mx-auto mt-8 max-w-lg text-bone/70 md:text-lg">
          Browse the stock, or just tell us what you&rsquo;re after and let us do the looking.
        </p>

        <div className="reveal mt-11 flex flex-col justify-center gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">
          <ButtonLink href="/vehicles" size="lg">
            View our stock
            <ArrowRight />
          </ButtonLink>
          <ButtonLink href="/contact" variant="outline" size="lg">
            Contact us
          </ButtonLink>
          <ExternalButtonLink
            href={whatsappLinks.browsing}
            target="_blank"
            rel="noopener noreferrer"
            variant="whatsapp"
            size="lg"
          >
            <WhatsAppIcon className="size-4" />
            WhatsApp us
          </ExternalButtonLink>
        </div>

        <p className="reveal mt-10 text-sm text-bone/60">
          Or call{" "}
          <a
            href={site.phone.href}
            className="link-line inline-flex items-center gap-1.5 text-bone transition-colors hover:text-brass-bright"
          >
            <Phone className="size-3.5" />
            {site.phone.display}
          </a>
        </p>
      </Container>
    </section>
  );
}
