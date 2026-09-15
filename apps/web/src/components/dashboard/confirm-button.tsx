"use client";

import { useId, useRef } from "react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * A button that asks before doing something hard to undo. Uses the native
 * <dialog>: it traps focus, closes on Escape and returns focus by itself.
 *
 * With `form`, confirming submits that server action with the given hidden
 * fields; with `onConfirm`, it runs the callback instead.
 */
export function ConfirmButton({
  label,
  title,
  body,
  confirmLabel,
  tone = "default",
  action,
  fields,
  onConfirm,
  className,
  buttonVariant = "outline",
}: {
  label: React.ReactNode;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  tone?: "default" | "danger";
  action?: (formData: FormData) => void | Promise<void>;
  fields?: Record<string, string>;
  onConfirm?: () => void;
  className?: string;
  buttonVariant?: "outline" | "ghost" | "primary";
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={cn(
          buttonVariant === "ghost"
            ? "flex min-h-11 w-full items-center px-3 text-left text-sm hover:bg-[var(--surface)]"
            : "inline-flex h-11 items-center justify-center border border-[var(--border-strong)] px-4 text-xs font-medium uppercase tracking-[0.12em] transition-colors hover:border-[var(--primary)]",
          tone === "danger" && buttonVariant === "ghost" && "text-danger",
          className,
        )}
      >
        {label}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] border border-[var(--border-strong)] bg-[var(--background)] p-0 text-[var(--foreground)] backdrop:bg-ink-950/60"
      >
        <form
          action={
            action
              ? async (formData) => {
                  dialogRef.current?.close();
                  await action(formData);
                }
              : undefined
          }
          onSubmit={
            action
              ? undefined
              : (event) => {
                  event.preventDefault();
                  dialogRef.current?.close();
                  onConfirm?.();
                }
          }
          className="p-6"
        >
          {fields ? Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />) : null}
          <h2 id={titleId} className="font-display text-xl">
            {title}
          </h2>
          <div className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]">{body}</div>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => dialogRef.current?.close()}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className={tone === "danger" ? "border-danger bg-danger text-white hover:bg-transparent hover:text-danger" : undefined}>
              {confirmLabel}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
