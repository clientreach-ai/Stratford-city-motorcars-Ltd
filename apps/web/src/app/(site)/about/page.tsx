import type { Metadata } from "next";
import Image from "next/image";

import { BuyingJourney } from "@/components/site/buying-journey";
import { PageHero } from "@/components/site/page-hero";
import { ShowroomPanel } from "@/components/site/showroom-panel";
import { ButtonLink, ExternalButtonLink } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/icons";
import { JsonLd } from "@/components/ui/json-ld";
import { Container, Eyebrow, Section, SectionHeading } from "@/components/ui/section";
import { stockSources } from "@/lib/content/services";
import { getAvailableVehicles } from "@/lib/inventory/repository";
import { breadcrumbSchema, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { whatsappLinks } from "@/lib/whatsapp";

/*
 * Rewritten from the client intake. Kept from the old site, as the client asked:
 * the "small, independent showroom" line (verbatim) and the take-your-time
 * story. Not used: "East London's Prestige Specialists", "Local Expertise",
 * "years getting to know" (no confirmed history wording — trading since 2019
 * versus incorporated 2024 is awaiting the client), staff names (the client
 * does not want people named) and the old three promises (awaiting the
 * client's reordering and rewording).
 */
export const metadata: Metadata = pageMetadata({
  title: "About Us — A Family-Owned Car Dealer in Stratford",
  description:
    "Stratford City Motorcars is a small family-owned business trading in sports and luxury cars on Romford Road, Stratford, East London. Take your time — every enquiry is handled personally.",
  path: "/about",
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "About", path: "/about" },
];

const principles = [
  {
    title: "Take your time",
    detail:
      "We'd rather you left feeling good about your decision than rushed into one. Look the car over properly, ask everything you want to ask, come back for a second look. There's no script and no pressure.",
  },
  {
    title: "The car has to be right",
    detail:
      "We won't put something on the forecourt we wouldn't be happy to drive ourselves. We take pride in our stock, and a car only goes online once it has been photographed inside and out.",
  },
  {
    title: "You deal with us",
    detail:
      "We're a family business, not a sales floor. Call, message or visit and you're speaking to the people who own the business, from the first question to the handover.",
  },
];

export default async function AboutPage() {
  const vehicles = await getAvailableVehicles();
  const marques = [...new Set(vehicles.map((vehicle) => vehicle.make))].sort();

  return (
    <>
      <JsonLd data={breadcrumbSchema(crumbs)} />

      <PageHero
        eyebrow="About us"
        title="A small family business"
        lede="Stratford City Motorcars is a family-owned business on Romford Road in Stratford, East London, trading in sports and luxury cars. When you get in touch, you deal with us directly."
        crumbs={crumbs}
      />

      {/* ---- The story ------------------------------------------------------ */}
      <Section size="md">
        <Container>
          <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-20">
            <div className="container-prose ml-0 max-w-none">
              <Eyebrow>Who we are</Eyebrow>

              <div className="mt-6 space-y-6 text-base leading-[1.8] md:text-lg">
                {/* The client's own words, approved in the intake: "don't touch it". */}
                <p className="font-display text-[clamp(1.35rem,2.6vw,1.75rem)] leading-[1.5]">
                  We&rsquo;re a small, independent showroom and we like it that way. We won&rsquo;t put something
                  on the forecourt we wouldn&rsquo;t be happy to drive ourselves.
                </p>

                <p className="text-[var(--muted-foreground)]">
                  We trade in sports and luxury cars, and we&rsquo;d rather give you an experience than a car sale.
                  Buying a car like this should be something you enjoy, not something you get through — so the
                  showroom is welcoming and comfortable, and nobody is going to hurry you.
                </p>

                <p className="text-[var(--muted-foreground)]">
                  Take your time. Come in, look around, sit in the car, ask whatever you like. We&rsquo;d far
                  rather you left without buying than bought something that wasn&rsquo;t quite right — the first
                  costs us one sale, the second costs us a customer.
                </p>

                <p className="text-[var(--muted-foreground)]">
                  Every price is set by looking at the current market, and we aim to put the best car we can in
                  front of you at a competitive price. People travel from across the country for the right car,
                  and when that&rsquo;s too far, we deliver nationwide.
                </p>
              </div>
            </div>

            <aside className="lg:sticky lg:top-28 lg:self-start">
              <div className="border border-[var(--border)]">
                <div className="border-b border-[var(--border)] bg-ink-950 p-8">
                  <Image
                    src="/brand/logo-bone.webp"
                    alt={site.name}
                    width={900}
                    height={269}
                    sizes="161px"
                    className="h-12 w-auto"
                  />
                </div>

                <dl className="divide-y divide-[var(--border)]">
                  <Fact term="Where" value={site.address.full} />
                  <Fact term="Business" value="Small and family owned" />
                  <Fact term="Trading in" value="Sports and luxury cars" />
                  {marques.length > 0 ? <Fact term="Marques in stock" value={marques.join(", ")} /> : null}
                  <Fact term="Buying" value="Viewings and test drives by request · Nationwide delivery" />
                  <Fact term="Also" value="Finance explained · Part exchange welcome" />
                  <Fact term="Company" value={`${site.company.legalName}, company number ${site.company.number}`} />
                </dl>
              </div>

              <ButtonLink href="/vehicles" size="md" className="mt-4 w-full">
                See what we have in stock
              </ButtonLink>
            </aside>
          </div>
        </Container>
      </Section>

      {/* ---- How we work -------------------------------------------------- */}
      <Section tinted size="md">
        <Container>
          <SectionHeading
            eyebrow="How we work"
            title="What you can expect from us"
            lede="Nothing complicated. It's how we'd want to be treated buying a car ourselves."
          />
          <ul className="mt-14 grid gap-px border border-[var(--border)] bg-[var(--border)] md:grid-cols-3">
            {principles.map((item) => (
              <li key={item.title} className="reveal bg-[var(--background)] p-7 md:p-9">
                <h3 className="font-display text-2xl leading-snug">{item.title}</h3>
                <p className="mt-3.5 leading-relaxed text-[var(--muted-foreground)]">{item.detail}</p>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* ---- The stock ------------------------------------------------------ */}
      <Section size="md">
        <Container>
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
            <div>
              <Eyebrow>The cars</Eyebrow>
              <h2 className="mt-5 text-[clamp(2rem,4vw,2.75rem)] leading-[1.08]">
                Chosen one at a time
              </h2>
              <p className="mt-5 max-w-lg leading-relaxed text-[var(--muted-foreground)]">
                Our stock is sports and luxury cars, and it changes all the time. We hold more than we list
                online: a car only goes on the website once it has been properly photographed, inside and out,
                so you can see exactly what you&rsquo;re looking at before you visit.
              </p>
              <p className="mt-4 max-w-lg leading-relaxed text-[var(--muted-foreground)]">
                Looking for something in particular? Tell us, and we&rsquo;ll let you know what we have.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/vehicles" size="md">
                  View cars
                </ButtonLink>
                <ExternalButtonLink
                  href={whatsappLinks.sourcing}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="whatsapp"
                  size="md"
                >
                  <WhatsAppIcon className="size-4" />
                  Tell us what you want
                </ExternalButtonLink>
              </div>
            </div>

            <div className="border border-[var(--border)] bg-[var(--surface)] p-7 md:p-10">
              <h3 className="font-roman text-[0.625rem] uppercase tracking-[0.22em] text-[var(--rule)]">
                Where our cars come from
              </h3>
              <ul className="mt-6 divide-y divide-[var(--border)] border-y border-[var(--border)]">
                {stockSources.map((source) => (
                  <li key={source} className="py-4 font-display text-xl">
                    {source}
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-sm leading-relaxed text-[var(--muted-foreground)]">
                Wherever a car comes from, ask us anything about it — its history, its paperwork and what we know
                about it.
              </p>
            </div>
          </div>
        </Container>
      </Section>

      <BuyingJourney tinted eyebrow="Buying from us" title="How buying a car with us works" />

      {/* ---- Visit ------------------------------------------------------------ */}
      <Section size="md">
        <Container>
          <SectionHeading
            eyebrow="Come and see us"
            title="The showroom"
            lede={`${site.address.full}, with free parking on site. Call ahead and we'll have the car you'd like to see ready for you.`}
          />
          <div className="mt-14">
            <ShowroomPanel />
          </div>
        </Container>
      </Section>
    </>
  );
}

function Fact({ term, value }: { term: string; value: string }) {
  return (
    <div className="p-5">
      <dt className="font-roman text-[0.5625rem] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
        {term}
      </dt>
      <dd className="mt-1.5 text-sm leading-relaxed">{value}</dd>
    </div>
  );
}
