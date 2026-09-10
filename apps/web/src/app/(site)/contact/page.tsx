import type { Metadata } from "next";
import { Mail, MessageSquare, Phone } from "lucide-react";

import { ContactForm } from "@/components/forms/contact-form";
import { FaqList } from "@/components/site/faq-list";
import { PageHero } from "@/components/site/page-hero";
import { ShowroomPanel } from "@/components/site/showroom-panel";
import { WhatsAppIcon } from "@/components/ui/icons";
import { JsonLd } from "@/components/ui/json-ld";
import { Container, Eyebrow, Section } from "@/components/ui/section";
import { faqsByCategory } from "@/lib/content/faqs";
import { breadcrumbSchema, faqSchema, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { whatsappLinks } from "@/lib/whatsapp";

export const metadata: Metadata = pageMetadata({
  title: "Contact — Romford Road, Stratford E15",
  description:
    "Call, WhatsApp or email us. Find us at 21-25 Romford Road, Stratford, London E15 4LJ with free parking on site. Open Mon–Sat 9–6, Sun 10–4.",
  path: "/contact",
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Contact", path: "/contact" },
];

export default function ContactPage() {
  const visitingFaqs = faqsByCategory("Visiting");

  return (
    <>
      <JsonLd data={[breadcrumbSchema(crumbs), faqSchema(visitingFaqs)]} />

      <PageHero
        eyebrow="Contact"
        title="Talk to a person, not a queue"
        lede="Call us, message us on WhatsApp, or send a note below. Whichever you choose, you'll reach someone who knows the cars on the floor."
        crumbs={crumbs}
      >
        {/* Direct channels first — most people arriving here want to call. */}
        <div className="mt-12 grid gap-px bg-bone/12 sm:grid-cols-3">
          <ChannelCard
            href={site.phone.href}
            icon={<Phone className="size-5" />}
            label="Call the showroom"
            value={site.phone.display}
            detail="Mon–Sat 9am–6pm · Sun 10am–4pm"
          />
          <ChannelCard
            href={whatsappLinks.general}
            external
            icon={<WhatsAppIcon className="size-5" />}
            label="WhatsApp"
            value={site.whatsapp.display}
            detail="Good for questions and photos"
          />
          <ChannelCard
            href={`mailto:${site.email}`}
            icon={<Mail className="size-5" />}
            label="Email"
            value={site.email}
            detail="For anything longer or with attachments"
          />
        </div>
      </PageHero>

      {/* ---- Form ----------------------------------------------------------- */}
      <Section size="md">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-20">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <Eyebrow>Send a message</Eyebrow>
              <h2 className="mt-5 text-[clamp(2rem,4vw,2.75rem)] leading-[1.08]">
                Tell us what you need
              </h2>
              <p className="mt-5 max-w-lg leading-relaxed text-[var(--muted-foreground)]">
                Whether it&rsquo;s a specific car, a finance question, a
                part-exchange valuation or something else entirely — send it over
                and we&rsquo;ll come back to you, usually the same day.
              </p>

              <div className="mt-10 border-t border-[var(--border)] pt-8">
                <div className="flex items-start gap-4">
                  <MessageSquare
                    aria-hidden
                    className="mt-0.5 size-5 shrink-0 text-[var(--rule)]"
                  />
                  <div>
                    <h3 className="font-medium">Looking for something specific?</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
                      We hold more stock than we list online, and we can source to
                      order. Tell us the make, model and budget and we&rsquo;ll go
                      and look for you.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-[var(--border)] p-6 md:p-9">
              <ContactForm />
            </div>
          </div>
        </Container>
      </Section>

      {/* ---- Finding us ------------------------------------------------------ */}
      <Section tinted size="md">
        <Container>
          <div className="max-w-2xl">
            <Eyebrow>Finding us</Eyebrow>
            <h2 className="mt-5 text-[clamp(2rem,4vw,2.75rem)] leading-[1.08]">
              21-25 Romford Road, Stratford
            </h2>
            <p className="mt-5 leading-relaxed text-[var(--muted-foreground)]">
              We&rsquo;re on Romford Road with free parking on site. Sat nav can
              be vague around here — {site.satNavPostcode} takes you to the
              parking entrance more reliably than the postcode.
            </p>
          </div>

          <div className="mt-14">
            <ShowroomPanel />
          </div>
        </Container>
      </Section>

      {/* ---- FAQs ------------------------------------------------------------ */}
      <Section size="md">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-20">
            <div>
              <Eyebrow>Before you come</Eyebrow>
              <h2 className="mt-5 text-[clamp(1.75rem,3.4vw,2.5rem)] leading-tight">
                Visiting questions
              </h2>
            </div>
            <FaqList faqs={visitingFaqs} />
          </div>
        </Container>
      </Section>
    </>
  );
}

function ChannelCard({
  href,
  external = false,
  icon,
  label,
  value,
  detail,
}: {
  href: string;
  external?: boolean;
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="group bg-ink-950 p-6 transition-colors duration-300 hover:bg-ink-900 md:p-7"
    >
      <span
        aria-hidden
        className="inline-flex text-brass transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:-translate-y-0.5"
      >
        {icon}
      </span>
      <p className="mt-4 font-roman text-[0.5625rem] uppercase tracking-[0.2em] text-bone/50">
        {label}
      </p>
      <p className="mt-2 break-all font-display text-lg text-bone">{value}</p>
      <p className="mt-1.5 text-xs text-bone/60">{detail}</p>
    </a>
  );
}
