import Image from "next/image";
import { Camera } from "lucide-react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";
import type { VehicleImage, VehicleStatus } from "@/lib/inventory/types";

/** Small shared pieces for dashboard pages. Server-safe (no client state). */

const STATUS_STYLE: Record<VehicleStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "border-[var(--border-strong)] text-[var(--muted-foreground)]" },
  published: { label: "Published", className: "border-success bg-success text-white" },
  sold: { label: "Sold", className: "border-ink-950 bg-ink-950 text-bone" },
  archived: { label: "Archived", className: "border-[var(--border-strong)] bg-[var(--muted)] text-[var(--muted-foreground)]" },
};

export function StatusBadge({ status }: { status: VehicleStatus }) {
  const style = STATUS_STYLE[status];
  return (
    <span className={cn("inline-flex h-6 items-center border px-2 text-[0.6875rem] font-medium uppercase tracking-[0.08em]", style.className)}>
      {style.label}
    </span>
  );
}

export function Tag({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "warning" | "brass" }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center border px-2 text-[0.6875rem]",
        tone === "warning" && "border-danger/40 bg-danger/5 text-danger",
        tone === "brass" && "border-brass-deep/50 text-brass-deep",
        tone === "neutral" && "border-[var(--border)] text-[var(--muted-foreground)]",
      )}
    >
      {children}
    </span>
  );
}

export function Thumb({ image, className }: { image?: VehicleImage; className?: string }) {
  return (
    <div className={cn("relative aspect-[4/3] overflow-hidden bg-[var(--muted)]", className)}>
      {image ? (
        <Image src={image.src} alt="" fill sizes="96px" className="object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center text-[var(--muted-foreground)]">
          <Camera aria-hidden className="size-5" />
          <span className="sr-only">No photographs yet</span>
        </div>
      )}
    </div>
  );
}

export function PageTitle({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl leading-tight md:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted-foreground)]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({ title, children, className, action }: { title?: string; children: React.ReactNode; className?: string; action?: React.ReactNode }) {
  return (
    <section className={cn("border border-[var(--border)] bg-[var(--background)]", className)}>
      {title ? (
        <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-3.5">
          <h2 className="text-sm font-medium">{title}</h2>
          {action}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "success" | "error"; children: React.ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "mb-6 border px-4 py-3 text-sm leading-relaxed",
        tone === "info" && "border-[var(--border-strong)] bg-[var(--background)]",
        tone === "success" && "border-success/40 bg-success/5",
        tone === "error" && "border-danger/40 bg-danger/5",
      )}
    >
      {children}
    </div>
  );
}
