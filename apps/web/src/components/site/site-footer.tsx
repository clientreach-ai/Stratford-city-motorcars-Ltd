import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

import { WhatsAppIcon } from "@/components/ui/icons";
import { mapLinks, site } from "@/lib/site";
import { whatsappLinks } from "@/lib/whatsapp";

const stockLinks = [
  { href: "/vehicles", label: "All vehicles" },
  { href: "/vehicles?make=Rolls-Royce", label: "Rolls-Royce" },
  { href: "/vehicles?make=Mercedes-Benz", label: "Mercedes-Benz" },
  { href: "/vehicles?bodyType=Convertible", label: "Convertibles" },
  { href: "/vehicles?bodyType=SUV", label: "SUVs" },
] as const;

const serviceLinks = [
  { href: "/finance", label: "Car finance" },
  { href: "/part-exchange", label: "Part exchange" },
  { href: "/hire", label: "Executive hire" },
  { href: "/about", label: "About us" },
  { href: "/contact", label: "Contact" },
] as const;

export function SiteFooter() {
  return (
    <footer data-surface="dark" className="bg-ink-950 text-bone">
      <div className="container-page py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr] lg:gap-10">
          <div>
            <Image
              src="/brand/logo-bone.webp"
              alt={site.name}
              width={900}
              height={269}
              sizes="200px"
              className="h-11 w-auto"
            />
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-bone/55">
              An independent Stratford showroom dealing in prestige, performance
              and classic motorcars. Every car HPI clear, inspected and prepared
              before it is offered for sale.
            </p>

            <div className="mt-7 flex flex-wrap gap-2">
              <a
                href={site.phone.href}
                className="flex items-center gap-2.5 border border-bone/20 px-4 py-2.5 text-xs tracking-wide transition-colors hover:border-bone hover:bg-bone hover:text-ink-950"
              >
                <Phone className="size-3.5" />
                {site.phone.display}
              </a>
              <a
                href={whatsappLinks.general}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 border border-bone/20 px-4 py-2.5 text-xs tracking-wide transition-colors hover:border-whatsapp hover:bg-whatsapp hover:text-whatsapp-ink"
              >
                <WhatsAppIcon className="size-3.5" />
                WhatsApp
              </a>
            </div>
          </div>

          <FooterColumn title="Stock">
            {stockLinks.map((link) => (
              <FooterLink key={link.label} href={link.href}>
                {link.label}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="Services">
            {serviceLinks.map((link) => (
              <FooterLink key={link.href} href={link.href}>
                {link.label}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="Visit the showroom">
            <li className="flex gap-3 text-sm text-bone/60">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brass" />
              <a
                href={mapLinks.place}
                target="_blank"
                rel="noopener noreferrer"
                className="not-italic transition-colors hover:text-bone"
              >
                {site.address.street}
                <br />
                {site.address.locality}, {site.address.region} {site.address.postcode}
              </a>
            </li>
            <li className="flex gap-3 text-sm text-bone/60">
              <Mail className="mt-0.5 size-4 shrink-0 text-brass" />
              <a
                href={`mailto:${site.email}`}
                className="break-all transition-colors hover:text-bone"
              >
                {site.email}
              </a>
            </li>
            <li className="pt-1">
              <dl className="space-y-1 text-sm text-bone/60">
                {site.openingHoursSummary.map((entry) => (
                  <div key={entry.label} className="flex justify-between gap-4">
                    <dt>{entry.label}</dt>
                    <dd data-numeric className="text-bone/80">{entry.value}</dd>
                  </div>
                ))}
              </dl>
            </li>
          </FooterColumn>
        </div>

        <div className="mt-14 border-t border-bone/10 pt-8">
          <p className="max-w-4xl text-xs leading-relaxed text-bone/60">
            {site.compliance.creditBroker} {site.compliance.financeSubjectToStatus}
          </p>

          <div className="mt-6 flex flex-col justify-between gap-4 text-xs text-bone/60 sm:flex-row sm:items-center">
            <p>
              © {new Date().getFullYear()} {site.name}. All rights reserved.
            </p>
            <nav aria-label="Legal">
              <ul className="flex flex-wrap gap-x-6 gap-y-2">
                <li>
                  <Link href="/privacy" className="transition-colors hover:text-bone">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="transition-colors hover:text-bone">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link href="/cookies" className="transition-colors hover:text-bone">
                    Cookies
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="font-roman text-[0.625rem] uppercase tracking-[0.22em] text-brass">
        {title}
      </h2>
      <ul className="mt-5 space-y-3">{children}</ul>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: React.ComponentProps<typeof Link>["href"];
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="text-sm text-bone/60 transition-colors duration-200 hover:text-bone"
      >
        {children}
      </Link>
    </li>
  );
}
