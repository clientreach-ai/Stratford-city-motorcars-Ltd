import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { VehicleEditor } from "@/components/dashboard/vehicle-editor";
import { loadRecord, summarise } from "@/lib/dashboard/inventory";
import { requireStaff } from "@/lib/server/staff";

export const metadata: Metadata = { title: "Edit car" };

export default async function EditVehiclePage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireStaff();
  const [{ id }, search] = await Promise.all([props.params, props.searchParams]);
  const record = await loadRecord(id);
  if (!record) notFound();

  const { name } = summarise(record);
  const flash =
    search.publish === "blocked"
      ? { tone: "error" as const, text: "This car can't be published yet. Everything that's missing is listed on the right." }
      : search.duplicated
        ? { tone: "info" as const, text: "This is a new draft copied from another car. Add its own photos, registration and history." }
        : null;

  return (
    <>
      <Link href="/dashboard/inventory" className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
        <ChevronLeft aria-hidden className="size-4" /> Inventory
      </Link>
      <h1 className="mb-6 font-display text-3xl leading-tight md:text-4xl">{name}</h1>
      {/* Keyed by id so moving between cars never carries unsaved state across. */}
      <VehicleEditor key={record.id} initialRecord={record} publicUrl={`/vehicles/${record.slug}`} initialFlash={flash} />
    </>
  );
}
