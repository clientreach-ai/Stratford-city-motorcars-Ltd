import type { Metadata } from "next";

import Providers from "@/components/providers";

/**
 * Staff-facing routes. Kept out of the public chrome and out of the index —
 * this is the seam the admin dashboard will be built into.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Providers>
      <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
        {children}
      </div>
    </Providers>
  );
}
