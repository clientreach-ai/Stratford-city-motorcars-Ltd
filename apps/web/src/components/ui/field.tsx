import { ChevronDown } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";

/**
 * Form primitives.
 *
 * Selects are native on purpose. On a phone the OS picker beats any custom
 * dropdown for speed and accessibility, and it costs no JavaScript — which
 * matters when half the audience is filtering stock on mobile data.
 */

const controlBase =
  "w-full rounded-sm border bg-[var(--surface-raised)] px-4 text-[0.9375rem] text-[var(--foreground)] " +
  "transition-colors duration-200 placeholder:text-[var(--muted-foreground)]/70 " +
  "focus-visible:border-[var(--ring)] focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50 " +
  "aria-[invalid=true]:border-[var(--destructive)]";

export function Label({
  className,
  required,
  children,
  ...props
}: ComponentProps<"label"> & { required?: boolean }) {
  return (
    <label
      className={cn(
        "block font-roman text-[0.625rem] uppercase tracking-[0.18em] text-[var(--muted-foreground)]",
        className,
      )}
      {...props}
    >
      {children}
      {required ? (
        <span aria-hidden className="ml-1 text-[var(--rule)]">
          *
        </span>
      ) : null}
    </label>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(controlBase, "h-12 border-[var(--input)]", className)}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        controlBase,
        "min-h-32 resize-y border-[var(--input)] py-3 leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(
          controlBase,
          "h-12 cursor-pointer appearance-none border-[var(--input)] pr-11",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]"
      />
    </div>
  );
}

export function Checkbox({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      type="checkbox"
      className={cn(
        "size-4.5 shrink-0 cursor-pointer appearance-none rounded-[1px] border border-[var(--input)]",
        "bg-[var(--surface-raised)] transition-colors duration-150",
        "checked:border-[var(--primary)] checked:bg-[var(--primary)]",
        // Tick drawn with a mask so it inherits the surface colour correctly.
        "checked:bg-[length:11px] checked:bg-center checked:bg-no-repeat",
        "checked:[background-image:url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%23faf8f3' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 8.5l3.5 3.5L13 5'/%3E%3C/svg%3E\")]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
        className,
      )}
      {...props}
    />
  );
}

interface FieldProps {
  label: string;
  name: string;
  required?: boolean;
  hint?: string;
  error?: string[];
  children: ReactNode;
  className?: string;
}

/**
 * Wraps a control with its label, hint and error. The error is wired via
 * aria-describedby and announced politely, so screen reader users hear the
 * validation message without the focus jumping.
 */
export function Field({
  label,
  name,
  required,
  hint,
  error,
  children,
  className,
}: FieldProps) {
  const hintId = hint ? `${name}-hint` : undefined;
  const errorId = error?.length ? `${name}-error` : undefined;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={name} required={required}>
        {label}
      </Label>
      {children}
      {hint ? (
        <p id={hintId} className="text-xs text-[var(--muted-foreground)]">
          {hint}
        </p>
      ) : null}
      {error?.length ? (
        <p
          id={errorId}
          role="alert"
          className="text-xs text-[var(--destructive)]"
        >
          {error[0]}
        </p>
      ) : null}
    </div>
  );
}

/** Ids to hand to a control inside `Field` so labels and errors connect up. */
export function fieldProps(name: string, error?: string[], hint?: string) {
  const describedBy = [hint ? `${name}-hint` : null, error?.length ? `${name}-error` : null]
    .filter(Boolean)
    .join(" ");

  return {
    id: name,
    name,
    "aria-invalid": error?.length ? (true as const) : undefined,
    "aria-describedby": describedBy || undefined,
  };
}

/** Off-screen honeypot. Real customers never see or fill this. */
export function Honeypot() {
  return (
    <div aria-hidden className="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden">
      <label htmlFor="website">Leave this field empty</label>
      <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
    </div>
  );
}
