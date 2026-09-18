"use client";

import { useEffect, useRef, useState } from "react";

import type { FormState } from "@/lib/forms/options";

/**
 * Moves focus to what the customer needs next after a submission: the first
 * invalid field, the "couldn't send" panel, or — once it has replaced the form
 * — the panel confirming what we received. Without this a keyboard or
 * screen-reader user is left at the submit button, or back at the top of the
 * document, with no idea what happened.
 */
export function useFormFeedbackFocus(state: FormState) {
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // On success the form is gone and the panel has taken its place.
    if (state.status === "success") {
      successRef.current?.focus();
      return;
    }
    const form = formRef.current;
    if (!form) return;
    if (state.status === "invalid") {
      form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    } else if (state.status === "unavailable") {
      form.querySelector<HTMLElement>('[data-feedback="unavailable"]')?.focus();
    }
  }, [state]);

  return { formRef, successRef };
}

/**
 * A key that changes with every submission result.
 *
 * React resets a form's DOM once its action has run. A text box picks its
 * answer up again from `defaultValue`, but a dropdown does not: it drops back
 * to its first option, so a rejected or throttled submission quietly emptied
 * every select on the page. Keying the dropdowns on this remounts them with
 * what the customer chose still selected.
 */
export function useSubmissionKey(state: FormState): number {
  const [seen, setSeen] = useState(state);
  const [key, setKey] = useState(0);

  if (state !== seen) {
    setSeen(state);
    setKey((current) => current + 1);
  }

  return key;
}
