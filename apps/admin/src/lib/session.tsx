"use client";

import { can as roleCan, errorMessage, ValidationError, type Capability, type SessionUser } from "@Stratford-city-motorcars-Ltd/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useId, useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, TextInput } from "@/components/ui/form";
import { useLeaveGuard } from "@/components/ui/unsaved";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query";
import { useSessionStore } from "@/stores/session";

/**
 * Who is signed in, and what the interface may offer them.
 *
 * `can()` decides what is SHOWN. The API decides what is ALLOWED, on every
 * request, from its own session — a hidden button protects nothing.
 */

type SessionValue = {
  user: SessionUser;
  can: (capability: Capability) => boolean;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionGate.");
  return value;
}

export function useSessionQuery() {
  return useQuery({ queryKey: queryKeys.session, queryFn: ({ signal }) => api.session.get({ signal }), staleTime: 60_000 });
}

/**
 * Holds every admin screen back until the session is known.
 *
 * A session that ends under unsaved work does not take the page with it: the
 * screen stays as it is and asks for the password again, so the work can
 * still be saved. With nothing unsaved, it goes straight to sign in.
 */
export function SessionGate({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const pathname = usePathname();
  const guard = useLeaveGuard();
  const { data: user, isPending, error, refetch } = useSessionQuery();

  // Who was signed in, for the page kept on screen after the session ends.
  const [held, setHeld] = useState<SessionUser | null>(null);
  if (user && user !== held) setHeld(user);
  const [ended, setEnded] = useState(false);
  if (user && ended) setEnded(false);

  const toSignIn = useCallback(() => {
    // Search included, so a filtered list or an open tab comes back as it was.
    const here = pathname ? `${pathname}${window.location.search}` : "";
    const next = here && here !== "/dashboard" ? `?next=${encodeURIComponent(here)}` : "";
    void guard.leave(`/sign-in${next}` as Route, { replace: true });
  }, [pathname, guard]);

  const setUnauthorisedHandler = useSessionStore((state) => state.setUnauthorisedHandler);

  useEffect(() => {
    setUnauthorisedHandler(() => {
      client.setQueryData(queryKeys.session, null);
      if (guard.isDirty()) setEnded(true);
      else toSignIn();
    });
    return () => setUnauthorisedHandler(null);
  }, [client, guard, toSignIn, setUnauthorisedHandler]);

  // Also found out by the session check itself, refreshed in the background.
  const keepPage = Boolean(held) && !user && !isPending && (ended || guard.isDirty());
  useEffect(() => {
    if (isPending || error || user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacts to the background session check and the unsaved-work guard (a ref outside React state), so it can't be worked out during render; the prompt must also stay once shown
    if (keepPage) setEnded(true);
    else toSignIn();
  }, [isPending, error, user, keepPage, toSignIn]);

  const signOut = useCallback(async () => {
    if (!(await guard.confirmLeave())) return;
    // A failure here throws before anything is let go, so the page keeps its
    // unsaved changes and their protection.
    await api.session.signOut();
    client.clear();
    await guard.leave("/sign-in", { replace: true });
  }, [client, guard]);

  const current = user ?? (keepPage || ended ? held : null);

  // Only when there is no page to keep: a failed background check must not
  // unmount a screen someone is working in.
  if (error && !current) {
    return (
      <Splash>
        <p className="text-sm text-bone/80">We could not check your session.</p>
        <p className="mt-1 max-w-sm text-center text-xs text-bone/65">{error.message}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-5 h-10 border border-bone/30 px-4 text-[0.6875rem] font-medium tracking-[0.1em] text-bone uppercase transition-colors hover:border-bone hover:bg-bone hover:text-ink-950"
        >
          Try again
        </button>
      </Splash>
    );
  }

  if (!current) {
    return (
      <Splash>
        <p role="status" className="admin-eyebrow text-bone/65">
          {isPending ? "Checking your session…" : "Taking you to sign in…"}
        </p>
        {isPending ? <WakingHint /> : null}
      </Splash>
    );
  }

  return (
    <SessionContext value={{ user: current, can: (capability) => roleCan(current.role, capability), signOut }}>
      {children}
      {ended && !user ? (
        <SessionEnded
          user={current}
          onSignedIn={(signedIn) => {
            client.setQueryData(queryKeys.session, signedIn);
            // Whatever failed while signed out can load now.
            void client.invalidateQueries({ queryKey: queryKeys.all });
          }}
          onLeave={async () => {
            if (!(await guard.confirmLeave())) return;
            client.setQueryData(queryKeys.session, null);
            toSignIn();
          }}
        />
      ) : null}
    </SessionContext>
  );
}

/**
 * The session ended with work unsaved on the page. Asks for the password
 * again; dismissed, it stays as a bar at the foot of the screen, so the work
 * can be copied out first if need be.
 */
function SessionEnded({ user, onSignedIn, onLeave }: { user: SessionUser; onSignedIn: (user: SessionUser) => void; onLeave: () => void }) {
  const [asking, setAsking] = useState(true);
  const [password, setPassword] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const formId = useId();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!password) {
      setProblem("Enter your password.");
      return;
    }
    setBusy(true);
    setProblem(null);
    try {
      onSignedIn(await api.session.signIn({ email: user.email, password }));
    } catch (caught) {
      setProblem(caught instanceof ValidationError ? caught.message : errorMessage(caught, "Could not sign you in. Try again."));
      setBusy(false);
    }
  };

  if (!asking) {
    return (
      <div
        role="alert"
        className="fixed inset-x-3 bottom-3 z-40 flex flex-wrap items-center justify-between gap-3 border border-destructive/40 bg-surface-raised px-4 py-3 shadow-[0_12px_32px_rgba(10,10,11,0.14)] sm:left-auto sm:w-[26rem]"
      >
        <p className="text-sm">Your session has ended. Sign in again to save your changes.</p>
        <Button size="sm" variant="primary" onClick={() => setAsking(true)}>
          Sign in again
        </Button>
      </div>
    );
  }

  return (
    <Dialog
      open
      onClose={() => setAsking(false)}
      title="Sign in again to keep your changes"
      description="Your session has ended. Your unsaved changes are still on this page — sign in, then save them."
      width="28rem"
      footer={
        <>
          <Button variant="ghost" onClick={onLeave}>
            Leave without saving
          </Button>
          <Button variant="primary" type="submit" form={formId} busy={busy}>
            Sign in
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={(event) => void submit(event)} className="space-y-4" noValidate>
        <p className="text-sm text-ink-700">
          Signing in as <strong className="font-medium">{user.email}</strong>
        </p>
        <Field label="Password" error={problem ?? undefined}>
          {(c) => (
            <TextInput
              {...c}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setProblem(null);
              }}
              data-autofocus
            />
          )}
        </Field>
      </form>
    </Dialog>
  );
}

/**
 * The API sleeps after a quiet spell and takes about a minute to wake. Past a
 * few seconds, say so — otherwise a first visit of the day looks broken.
 */
function WakingHint() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 5_000);
    return () => clearTimeout(timer);
  }, []);
  if (!slow) return null;
  return (
    <p className="mt-3 max-w-sm text-center text-xs leading-relaxed text-bone/65">
      The server is starting up after a quiet spell. This can take up to a minute — keep this page open.
    </p>
  );
}

function Splash({ children }: { children: ReactNode }) {
  return (
    <div data-surface="dark" className="flex min-h-dvh flex-col items-center justify-center bg-ink-950 px-6 text-bone">
      {children}
    </div>
  );
}

/** Renders children only when the signed-in role has the capability. Presentation only. */
export function Can({ capability, children, fallback = null }: { capability: Capability; children: ReactNode; fallback?: ReactNode }) {
  const { can } = useSession();
  return <>{can(capability) ? children : fallback}</>;
}
