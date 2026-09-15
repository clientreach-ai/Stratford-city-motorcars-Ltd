import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";

import { dashboardSetup, getStaffSession } from "@/lib/server/staff";
import { site } from "@/lib/site";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

// Reads the session cookie on every request.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const setup = dashboardSetup();
  if (setup.ready && (await getStaffSession())) redirect("/dashboard");

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <div data-surface="dark" className="flex justify-center bg-ink-950 px-8 py-7">
          <Image src="/brand/logo-bone.webp" alt={site.name} width={900} height={269} sizes="161px" className="h-12 w-auto" />
        </div>

        <div className="border border-t-0 border-[var(--border)] bg-[var(--background)] p-7">
          <h1 className="font-display text-2xl">Dealership dashboard</h1>

          {setup.ready ? (
            <>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
                Sign in to manage your stock and enquiries.
              </p>
              <LoginForm />
            </>
          ) : (
            <div role="status" className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--muted-foreground)]">
              <p>The dashboard isn&rsquo;t set up on this server yet.</p>
              <p>
                Whoever manages the website needs to add{" "}
                {setup.missing.map((name, index) => (
                  <span key={name}>
                    <code className="bg-[var(--muted)] px-1 py-0.5 text-xs text-[var(--foreground)]">{name}</code>
                    {index < setup.missing.length - 1 ? ", " : ""}
                  </span>
                ))}{" "}
                and create a login. See the project documentation.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
