"use client";

import { useEffect, useRef } from "react";

import type { FormState } from "@/lib/forms/options";

/**
 * Moves focus to what the customer needs next after a submission: the first
 * invalid field, or the "couldn't send" panel. Without this a keyboard or
 * screen-reader user is left at the submit button with no idea what happened.
 */
export function useFormFeedbackFocus(state: FormState) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    if (state.status === "invalid") {
      form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    } else if (state.status === "unavailable") {
      form.querySelector<HTMLElement>('[data-feedback="unavailable"]')?.focus();
    }
  }, [state]);

  return formRef;
}

/** "test-aston-martin-vantage-2019" → "Test Aston Martin Vantage 2019", for prefilling from a link. */
export function humaniseSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => (/^\d+$/.test(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(" ");
}

export function validVehicleSlug(value: string | null | undefined): string | undefined {
  return value && /^[a-z0-9-]{1,120}$/.test(value) ? value : undefined;
}
