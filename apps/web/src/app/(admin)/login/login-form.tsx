"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

/**
 * Posts straight to the auth endpoint rather than shipping an auth client
 * library to the browser. Errors are deliberately generic: the form never
 * says whether an email address has an account.
 */
export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);

  /**
   * A submit handler rather than a form action: React resets a form after an
   * action runs, which would clear the email address after a mistyped password.
   */
  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    setSubmitting(true);
    const response = await fetch("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: String(formData.get("email") ?? "").trim(),
        password: String(formData.get("password") ?? ""),
        rememberMe: false,
      }),
      credentials: "same-origin",
    }).catch(() => null);

    setSubmitting(false);
    if (response?.ok) {
      startTransition(() => {
        router.replace("/dashboard");
        router.refresh();
      });
      return;
    }
    setError(
      response?.status === 429
        ? "Too many attempts. Please wait a minute and try again."
        : response
          ? "That email and password don't match. Please try again."
          : "We couldn't reach the server. Check your connection and try again.",
    );
  }

  return (
    <form onSubmit={signIn} className="mt-6 space-y-5" noValidate={false}>
      {error ? (
        <p role="alert" className="border border-[var(--destructive)]/40 bg-[var(--destructive)]/5 px-4 py-3 text-sm">
          {error}
        </p>
      ) : null}
      <Field label="Email" name="email" required>
        <Input id="email" name="email" type="email" autoComplete="username" required />
      </Field>
      <Field label="Password" name="password" required>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <SignInButton pending={pending || submitting} />
    </form>
  );
}

function SignInButton({ pending }: { pending: boolean }) {
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      Sign in
    </Button>
  );
}
