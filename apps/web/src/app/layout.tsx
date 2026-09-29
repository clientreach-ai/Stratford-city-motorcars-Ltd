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
 * All three are variable and self-hosted by next/font, so there are no
 * external requests and no layout shift.
 *
 * Only the faces most of the first screen is set in are preloaded: Newsreader
 * upright and Archivo. Every preload is fetched ahead of the hero photograph
 * (the LCP), so the Cinzel labels (10–11px) and the Newsreader italic (a few
 * accent words) are left to load when the page first uses them, swapping in
 * over their metric-matched fallbacks.
 */
const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-cinzel",
  display: "swap",
  preload: false,
});

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal"],
  variable: "--font-newsreader",
  display: "swap",
});

/**
 * The italic is its own instance only so it can skip the preload. Its
 * @font-face rules share the "Newsreader" family name, so `italic` text set in
 * `--font-newsreader` picks it up; the variable itself is never read, it is
 * applied below just so the rules ship with every page.
 */
const newsreaderItalic = Newsreader({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["italic"],
  variable: "--font-newsreader-italic",
  display: "swap",
  preload: false,
});

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-archivo",
  display: "swap",
});

/**
 * Site-wide defaults. Every public page sets its own title, description,
 * canonical and share image through `pageMetadata()` in `lib/seo.ts`; there is
 * deliberately no default canonical here, so a page that forgets one (or a
 * 404) never claims to be the homepage.
 */
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — Sports & Luxury Car Sales in East London`,
    template: `%s | ${site.name}`,
  },
  description:
    "Sports and luxury car sales in Stratford, East London, from a small family-owned business. Part exchange welcome.",
  applicationName: site.name,
  authors: [{ name: site.name, url: site.url }],
  creator: site.name,
  publisher: site.name,
  formatDetection: { telephone: true, address: true, email: true },
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: site.name,
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
      className={`${cinzel.variable} ${newsreader.variable} ${newsreaderItalic.variable} ${archivo.variable}`}
    >
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
