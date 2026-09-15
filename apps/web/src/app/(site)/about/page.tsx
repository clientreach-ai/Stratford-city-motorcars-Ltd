import type { Metadata } from "next";
import Image from "next/image";

import { PageHero } from "@/components/site/page-hero";
import { ShowroomPanel } from "@/components/site/showroom-panel";
import { ButtonLink } from "@/components/ui/button";
import { JsonLd } from "@/components/ui/json-ld";
import { Container, Eyebrow, Section, SectionHeading } from "@/components/ui/section";
import { getAvailableVehicles } from "@/lib/inventory/repository";
import { breadcrumbSchema, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "About Us — Family-Owned Car Sales in Stratford",
  description:
    "A small family-owned business on Romford Road in Stratford, trading in sports and luxury cars. Every enquiry is handled personally.",
  path: "/about",
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "About", path: "/about" },
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
        lede="We're a family-owned business on Romford Road in Stratford, trading in sports and luxury cars. When you get in touch, you deal with us directly."
        crumbs={crumbs}
      />

      {/* ---- The story ------------------------------------------------------ */}
      <Section size="md">
        <Container>
          <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-20">
            <div className="container-prose ml-0 max-w-none">
              <Eyebrow>Our story</Eyebrow>

              <div className="mt-6 space-y-6 text-base leading-[1.8] md:text-lg">
                {/* The client's own words, approved in the intake: "don't touch it". */}
                <p className="font-display text-[clamp(1.35rem,2.6vw,1.75rem)] leading-[1.5]">
                  We&rsquo;re a small, independent showroom and we like it that
                  way. We won&rsquo;t put something on the forecourt we
                  wouldn&rsquo;t be happy to drive ourselves.
                </p>

                <p className="text-[var(--muted-foreground)]">
                  We&rsquo;re a family-owned business trading in sports and
                  luxury cars, and we&rsquo;d rather give you an experience than
                  a car sale. The showroom is welcoming and comfortable, we take
                  pride in our stock, and every enquiry is handled personally.
                </p>

                <p className="text-[var(--muted-foreground)]">
                  The showroom itself is relaxed. Come in, take your time, ask
                  whatever you like. There&rsquo;s no pressure and no script.
                  We&rsquo;d far rather you left without buying than bought
                  something that wasn&rsquo;t quite right — the first costs us one
                  sale, the second costs us a customer.
                </p>

                <p className="text-[var(--muted-foreground)]">
                  A car only appears on this website once it has been properly
                  photographed, inside and out, so you can see what you&rsquo;re
                  looking at before you visit. Tell us what you&rsquo;re after and
                  we&rsquo;ll help you find the right car.
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
                  <Fact term="Where" value={`${site.address.street}, ${site.address.locality} ${site.address.postcode}`} />
                  <Fact term="Business" value="Family owned" />
                  <Fact term="Trading in" value="Sports and luxury cars" />
                  {marques.length > 0 ? (
                    <Fact term="Marques in stock" value={marques.join(", ")} />
                  ) : null}
                  <Fact term="Also" value="Part exchange · Finance explained · Nationwide delivery" />
                </dl>
              </div>

              <ButtonLink href="/vehicles" size="md" className="mt-4 w-full">
                See what we have in
              </ButtonLink>
            </aside>
          </div>
        </Container>
      </Section>

      {/* ---- Visit ------------------------------------------------------------ */}
      <Section tinted size="md">
        <Container>
          <SectionHeading
            eyebrow="Come and see us"
            title="The showroom"
            lede="A short walk from Stratford station, with free parking on site."
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
