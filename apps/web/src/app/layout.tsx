import type { Metadata, Viewport } from "next";
import { Archivo, Cinzel, Newsreader } from "next/font/google";

import "../index.css";
import { site } from "@/lib/site";

/**
 * Three families, each with a job:
 *
 *  Cinzel     — Roman capitals. Echoes the inscriptional lettering in the
 *               dealership's logo. Used only for eyebrows and small labels.
 *  Newsreader — editorial serif for headlines and prices. Carries the
 *               heritage register the classic stock deserves.
 *  Archivo    — everything functional: body copy, spec tables, forms. Tabular
 *               figures keep mileage and price columns aligned.
 *
 * All three are variable and self-hosted by next/font, so this costs three
 * files with no external requests and no layout shift.
 */
const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-cinzel",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — Prestige Used Cars in Stratford, London`,
    template: `%s | ${site.name}`,
  },
  description:
    "Independent Stratford dealer in prestige, performance and classic used cars. Every vehicle HPI clear and inspected. Finance and part exchange available.",
  applicationName: site.name,
  authors: [{ name: site.name, url: site.url }],
  creator: site.name,
  publisher: site.name,
  formatDetection: { telephone: true, address: true, email: true },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: site.name,
    url: site.url,
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f3" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
  ],
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en-GB"
      // Next 16 no longer overrides CSS smooth scrolling during navigation
      // unless asked, and route changes should land at the top instantly.
      data-scroll-behavior="smooth"
      className={`${cinzel.variable} ${newsreader.variable} ${archivo.variable}`}
    >
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
