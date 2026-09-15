import type { Metadata } from "next";

/**
 * Staff-facing routes: sign-in and the dealership dashboard. No public chrome,
 * never indexed (see also the X-Robots-Tag and no-store headers in
 * next.config.ts and the robots.txt disallow).
 */
export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · Dashboard · Stratford City Motorcars" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-dvh bg-[var(--surface)] text-[var(--foreground)]">{children}</div>;
}
