"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Car, ExternalLink, Inbox, LayoutDashboard, LogOut, Menu, X } from "lucide-react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/inventory", label: "Inventory", icon: Car, exact: false },
  { href: "/dashboard/enquiries", label: "Enquiries", icon: Inbox, exact: false },
] as const;

/**
 * Dashboard frame: an ink sidebar on large screens, a compact top bar with a
 * menu on phones. Deliberately plain — the client is not a developer, so every
 * destination is named in words, not icons alone.
 */
export function DashboardShell({
  user,
  newEnquiries,
  children,
}: {
  user: { name: string; email: string };
  newEnquiries: number | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav aria-label="Dashboard">
      <ul className="space-y-1">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 px-3 text-sm transition-colors",
                  active ? "bg-bone/10 text-bone" : "text-bone/65 hover:bg-bone/5 hover:text-bone",
                )}
              >
                <item.icon aria-hidden className="size-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.href === "/dashboard/enquiries" && newEnquiries ? (
                  <span className="bg-brass px-1.5 py-0.5 text-[0.6875rem] font-medium text-ink-950" aria-label={`${newEnquiries} new`}>
                    {newEnquiries}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
        <li>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center gap-3 px-3 text-sm text-bone/65 transition-colors hover:bg-bone/5 hover:text-bone"
          >
            <ExternalLink aria-hidden className="size-4 shrink-0" />
            View website
          </a>
        </li>
      </ul>
    </nav>
  );

  const account = (
    <div className="border-t border-bone/10 pt-4">
      <p className="truncate px-3 text-sm text-bone">{user.name}</p>
      <p className="truncate px-3 text-xs text-bone/50">{user.email}</p>
      <SignOutButton />
    </div>
  );

  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[15rem_1fr]">
      <a
        href="#dashboard-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:bg-ink-950 focus:px-5 focus:py-3 focus:text-sm focus:text-bone"
      >
        Skip to content
      </a>

      {/* Sidebar, large screens */}
      <aside data-surface="dark" className="hidden bg-ink-950 text-bone lg:flex lg:flex-col lg:justify-between lg:px-3 lg:py-5">
        <div>
          <Link href="/dashboard" className="mb-8 block px-3" aria-label="Dashboard overview">
            <Image src="/brand/logo-bone.webp" alt="" width={900} height={269} sizes="128px" className="h-10 w-auto" />
          </Link>
          {nav}
        </div>
        {account}
      </aside>

      {/* Top bar, phones and tablets */}
      <header data-surface="dark" className="sticky top-0 z-40 flex h-14 items-center justify-between bg-ink-950 px-4 text-bone lg:hidden">
        <Link href="/dashboard" aria-label="Dashboard overview">
          <Image src="/brand/logo-bone.webp" alt="" width={900} height={269} sizes="100px" className="h-8 w-auto" />
        </Link>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="dashboard-menu"
          className="flex size-11 items-center justify-center"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </header>
      {open ? (
        <div id="dashboard-menu" data-surface="dark" className="border-t border-bone/10 bg-ink-950 px-3 pb-4 pt-2 text-bone lg:hidden">
          {nav}
          <div className="mt-4">{account}</div>
        </div>
      ) : null}

      <main id="dashboard-main" className="min-w-0 px-4 py-6 md:px-8 md:py-8">
        {children}
      </main>
    </div>
  );
}

function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await fetch("/api/auth/sign-out", { method: "POST", credentials: "same-origin" }).catch(() => null);
        router.replace("/login");
        router.refresh();
      }}
      className="mt-3 flex min-h-11 w-full items-center gap-3 px-3 text-sm text-bone/65 transition-colors hover:bg-bone/5 hover:text-bone disabled:opacity-50"
    >
      <LogOut aria-hidden className="size-4" />
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
