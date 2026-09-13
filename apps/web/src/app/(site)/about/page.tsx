import type { Metadata } from "next";
import Image from "next/image";

import { PageHero } from "@/components/site/page-hero";
import { ShowroomPanel } from "@/components/site/showroom-panel";
import { ButtonLink } from "@/components/ui/button";
import { JsonLd } from "@/components/ui/json-ld";
import { Container, Eyebrow, Section, SectionHeading } from "@/components/ui/section";
import { getAllVehicles } from "@/lib/inventory/repository";
import { breadcrumbSchema, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "About — Independent Stratford Dealer",
  description:
    "An independent showroom on Romford Road in Stratford. We buy carefully, prepare properly, and sell without pressure. Meet Stratford City Motorcars.",
  path: "/about",
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "About", path: "/about" },
];

export default async function AboutPage() {
  const vehicles = await getAllVehicles();
  const marques = [...new Set(vehicles.map((vehicle) => vehicle.make))].sort();

  return (
    <>
      <JsonLd data={breadcrumbSchema(crumbs)} />

      <PageHero
        eyebrow="About us"
        title="A small showroom that does things properly"
        lede="We're an independent dealer on Romford Road in Stratford. No group behind us, no targets handed down from head office, and nobody here works on commission."
        crumbs={crumbs}
      />

      {/* ---- The story ------------------------------------------------------ */}
      <Section size="md">
        <Container>
          <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-20">
            <div className="container-prose ml-0 max-w-none">
              <Eyebrow>Our story</Eyebrow>

              <div className="mt-6 space-y-6 text-base leading-[1.8] md:text-lg">
                <p className="font-display text-[clamp(1.35rem,2.6vw,1.75rem)] leading-[1.5]">
                  We&rsquo;re a small, independent showroom and we like it that
                  way. It means every customer gets our full attention, and every
                  car is chosen with care.
                </p>

                <p className="text-[var(--muted-foreground)]">
                  We&rsquo;ve spent years learning what makes a good used car —
                  and, more to the point, what makes a good buying experience.
                  Every vehicle we take on is chosen deliberately, checked
                  thoroughly, and only put up for sale once we&rsquo;re genuinely
                  happy with it. If a car doesn&rsquo;t meet that standard it
                  doesn&rsquo;t go on the forecourt; it goes back out.
                </p>

                <p className="text-[var(--muted-foreground)]">
                  The showroom itself is relaxed. Come in, take your time, ask
                  whatever you like. There&rsquo;s no pressure and no script.
                  We&rsquo;d far rather you left without buying than bought
                  something that wasn&rsquo;t quite right — the first costs us one
                  sale, the second costs us a customer.
                </p>

                <p className="text-[var(--muted-foreground)]">
                  Whether you&rsquo;re after an everyday car, a prestige saloon or
                  something genuinely special, we&rsquo;ll help you find the right
                  one and stay available afterwards. Most of our customers reach
                  the same person they first spoke to, months later.
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
                    sizes="200px"
                    className="h-12 w-auto"
                  />
                </div>

                <dl className="divide-y divide-[var(--border)]">
                  <Fact term="Where" value={`${site.address.street}, ${site.address.locality} ${site.address.postcode}`} />
                  <Fact term="Type" value="Independent dealership" />
                  {marques.length > 0 ? (
                    <Fact term="Marques in stock" value={marques.join(", ")} />
                  ) : null}
                  <Fact term="Also offering" value="Part exchange" />
                  <Fact term="Before sale" value="Every car has a full service and MOT" />
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
            lede="Two minutes from Stratford station, free parking on site, and someone here who actually knows the cars."
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
