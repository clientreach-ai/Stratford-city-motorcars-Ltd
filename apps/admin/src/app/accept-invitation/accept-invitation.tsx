"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/form";
import { dataSource } from "@/lib/api";

/**
 * Where an invitation email lands: the member chooses a password, which
 * activates their account, then signs in as usual.
 *
 * Talks to the API directly — this is the one screen used without a session,
 * so it is not part of `AdminApi`.
 */

const API = (process.env.NEXT_PUBLIC_ADMIN_API_URL ?? "").replace(/\/+$/, "");

type State =
  | { step: "loading" }
  | { step: "invalid"; message: string }
  | { step: "form"; name: string; email: string }
  | { step: "done" };

async function readError(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error || fallback;
}

export function AcceptInvitation() {
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = useState<State>({ step: "loading" });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (dataSource !== "api" || !API) {
      setState({ step: "invalid", message: "Invitations work only when the admin is connected to the API." });
      return;
    }
    if (!token) {
      setState({ step: "invalid", message: "This link is incomplete. Open the link from your invitation email again." });
      return;
    }
    let cancelled = false;
    fetch(`${API}/api/admin/invitations/${encodeURIComponent(token)}`)
      .then(async (response) => {
        if (cancelled) return;
        if (!response.ok) {
          setState({ step: "invalid", message: await readError(response, "This invitation link is invalid or has expired.") });
          return;
        }
        const invitation = (await response.json()) as { name: string; email: string };
        setState({ step: "form", ...invitation });
      })
      .catch(() => {
        if (!cancelled) setState({ step: "invalid", message: "Could not reach the server. Check your connection and try again." });
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");

    const errors: typeof fieldErrors = {};
    if (password.length < 12) errors.password = "Use at least 12 characters.";
    else if (password.length > 128) errors.password = "Use at most 128 characters.";
    if (confirm !== password) errors.confirm = "The two passwords do not match.";
    setFieldErrors(errors);
    setError(null);
    if (errors.password || errors.confirm) return;

    setBusy(true);
    try {
      const response = await fetch(`${API}/api/admin/invitations/${encodeURIComponent(token)}/accept`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        setError(await readError(response, "Your password could not be saved. Try again."));
        return;
      }
      setState({ step: "done" });
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section data-surface="dark" className="relative flex flex-col justify-between bg-ink-950 px-6 py-6 text-bone sm:px-10 lg:py-10">
        <Image src="/logo-bone.webp" alt="Stratford City Motorcars" width={900} height={269} sizes="160px" priority className="h-9 w-auto self-start lg:h-11" />
        <div className="hidden max-w-sm lg:block">
          <p className="admin-eyebrow">Dealership admin</p>
          <p className="mt-4 font-display text-[2.5rem] leading-[1.05]">Welcome to the team.</p>
          <div aria-hidden className="mt-8 h-px w-16 bg-brass" />
        </div>
        <p className="hidden text-xs text-bone/65 lg:block">21–25 Romford Road, London E15 4LJ</p>
      </section>

      <section className="flex items-start justify-center px-5 py-10 sm:items-center sm:px-10">
        <div className="w-full max-w-sm">
          <p className="admin-eyebrow">Invitation</p>

          {state.step === "loading" ? (
            <p role="status" className="mt-4 text-sm text-muted-foreground">
              Checking your invitation…
            </p>
          ) : null}

          {state.step === "invalid" ? (
            <>
              <h1 className="mt-2 font-display text-3xl">This link can't be used</h1>
              <div role="alert" className="mt-6 flex gap-2.5 border-l-2 border-destructive bg-destructive/6 px-3.5 py-3 text-[0.8125rem] text-ink-800">
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                {state.message}
              </div>
              <ButtonLink href="/sign-in" className="mt-6 w-full">
                Go to sign in
              </ButtonLink>
            </>
          ) : null}

          {state.step === "form" ? (
            <>
              <h1 className="mt-2 font-display text-3xl">Choose your password</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Hello {state.name}. You'll sign in as <span className="font-medium text-ink-800">{state.email}</span>.
              </p>

              {error ? (
                <div role="alert" className="mt-6 flex gap-2.5 border-l-2 border-destructive bg-destructive/6 px-3.5 py-3 text-[0.8125rem] text-ink-800">
                  <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                  {error}
                </div>
              ) : null}

              <form noValidate onSubmit={submit} className="mt-6 space-y-4">
                <input type="email" name="username" autoComplete="username" value={state.email} readOnly hidden />
                <Field label="New password" description="At least 12 characters." error={fieldErrors.password}>
                  {(control) => <TextInput {...control} name="password" type="password" autoComplete="new-password" />}
                </Field>
                <Field label="Type it again" error={fieldErrors.confirm}>
                  {(control) => <TextInput {...control} name="confirm" type="password" autoComplete="new-password" />}
                </Field>
                <Button type="submit" variant="primary" className="w-full" busy={busy}>
                  {busy ? "Saving…" : "Save password"}
                </Button>
              </form>
            </>
          ) : null}

          {state.step === "done" ? (
            <>
              <h1 className="mt-2 font-display text-3xl">You're all set</h1>
              <p role="status" className="mt-4 flex gap-2.5 text-sm text-ink-700">
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-brass" aria-hidden />
                Your password is saved. Sign in with your email address and new password.
              </p>
              <ButtonLink href="/sign-in" variant="primary" className="mt-6 w-full">
                Sign in
              </ButtonLink>
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}
