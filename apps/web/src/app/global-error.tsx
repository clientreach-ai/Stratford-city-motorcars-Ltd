"use client";

import { site } from "@/lib/site";

/**
 * Last-resort error page, used only if the root layout itself fails. It
 * replaces the whole document, so it carries its own minimal styling and no
 * dependency on the app's components or fonts.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-GB">
      <body style={{ margin: 0, background: "#0a0a0b", color: "#f4f1ea", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "2rem", textAlign: "center" }}>
          <div>
            <p style={{ letterSpacing: "0.2em", textTransform: "uppercase", fontSize: 12, color: "#b08d57" }}>
              {site.name}
            </p>
            <h1 style={{ fontWeight: 400, fontSize: 32, margin: "1rem 0" }}>This page didn&rsquo;t load</h1>
            <p style={{ opacity: 0.7, maxWidth: 420, margin: "0 auto 2rem", lineHeight: 1.6 }}>
              Please try again, or call us on <a href={site.phone.href} style={{ color: "inherit" }}>{site.phone.display}</a>.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{ background: "#f4f1ea", color: "#0a0a0b", border: 0, padding: "0.9rem 1.6rem", cursor: "pointer" }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
