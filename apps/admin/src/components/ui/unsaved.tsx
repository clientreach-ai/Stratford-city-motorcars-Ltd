"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  type ComponentProps,
  type ReactNode,
} from "react";

import { useConfirm } from "./dialog";

/**
 * Unsaved-changes protection.
 *
 * An editor calls `useUnsavedChanges(isDirty)` — as does a photograph still
 * uploading. While anything is dirty, closing or reloading the tab raises the
 * browser's warning, every admin link (`GuardedLink`) and signing out ask
 * before leaving, and so does the browser's Back (or a swipe back on an
 * iPhone).
 *
 * Back cannot be cancelled once pressed, so while the page is dirty it holds a
 * spare history entry for this same address: Back uses that up without
 * leaving, and the question is asked then. The spare entry is removed again
 * once the page is clean.
 */

type Guard = {
  mark: (key: string, dirty: boolean) => void;
  isDirty: () => boolean;
  confirmLeave: () => Promise<boolean>;
  /** Leave by replacing the spare history entry, when there is one, rather than adding another. */
  holdsSpareEntry: () => boolean;
};

const GuardContext = createContext<Guard | null>(null);

/** Marks the spare history entry. Next.js keeps its own keys beside it. */
const SPARE = "__adminUnsaved";

const onSpareEntry = () => (window.history.state as Record<string, unknown> | null)?.[SPARE] === true;

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const confirm = useConfirm();
  const dirty = useRef(new Set<string>());
  /** The address the spare entry was added for. */
  const spareFor = useRef<string | null>(null);
  /** Our own step back off the spare entry, which is not the user leaving. */
  const ownStep = useRef(false);
  const asking = useRef(false);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty.current.size) event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  /** Adds the spare entry while dirty, and takes it away once clean — only ever while this page is showing. */
  const syncHistory = useCallback(() => {
    const here = window.location.href;
    if (dirty.current.size) {
      if (!onSpareEntry()) window.history.pushState({ ...(window.history.state as object | null), [SPARE]: true }, "", here);
      spareFor.current = here;
      return;
    }
    if (onSpareEntry() && spareFor.current === here) {
      ownStep.current = true;
      window.history.back();
    }
    spareFor.current = null;
  }, []);

  const confirmLeave = useCallback(async () => {
    if (dirty.current.size === 0) return true;
    asking.current = true;
    const ok = await confirm({
      title: "Leave without saving?",
      body: "You have changes on this page that have not been saved. Leaving now discards them.",
      confirmLabel: "Discard changes",
      cancelLabel: "Keep editing",
      tone: "danger",
    }).finally(() => {
      asking.current = false;
    });
    if (ok) {
      dirty.current.clear();
      // Whoever asked is leaving now; the spare entry goes with the page.
      spareFor.current = null;
    }
    return ok;
  }, [confirm]);

  useEffect(() => {
    // Capturing, so it runs before Next.js's own listener and can keep it
    // from moving the app when the step back only used up the spare entry.
    const onPopState = (event: PopStateEvent) => {
      if (ownStep.current) {
        ownStep.current = false;
        event.stopImmediatePropagation();
        return;
      }
      // Only a step from the spare entry back onto this same page can be
      // caught; a jump further back has already left.
      if (!spareFor.current || onSpareEntry() || window.location.href !== spareFor.current) return;
      // Nothing on screen changes, so Next.js need not hear of it.
      event.stopImmediatePropagation();
      spareFor.current = null;
      if (!dirty.current.size) {
        // Saved since: the spare entry was all that was left, so carry on back.
        window.history.back();
        return;
      }
      // Hold the page again straight away, so a second Back while the
      // question is open is caught too.
      syncHistory();
      if (asking.current) return;
      void confirmLeave().then((ok) => {
        // Past the spare entry and the step just caught.
        if (ok) window.history.go(-2);
      });
    };
    window.addEventListener("popstate", onPopState, true);
    return () => window.removeEventListener("popstate", onPopState, true);
  }, [confirmLeave, syncHistory]);

  const mark = useCallback(
    (key: string, isDirty: boolean) => {
      if (isDirty) dirty.current.add(key);
      else dirty.current.delete(key);
      syncHistory();
    },
    [syncHistory],
  );

  const isDirty = useCallback(() => dirty.current.size > 0, []);
  const holdsSpareEntry = useCallback(() => onSpareEntry() && spareFor.current === window.location.href, []);
  const guard = useMemo(() => ({ mark, isDirty, confirmLeave, holdsSpareEntry }), [mark, isDirty, confirmLeave, holdsSpareEntry]);

  return <GuardContext value={guard}>{children}</GuardContext>;
}

export function useLeaveGuard() {
  const guard = useContext(GuardContext);
  if (!guard) throw new Error("useLeaveGuard must be used inside UnsavedChangesProvider.");
  return guard;
}

export function useUnsavedChanges(isDirty: boolean) {
  const { mark } = useLeaveGuard();
  const key = useId();
  useEffect(() => {
    mark(key, isDirty);
    return () => mark(key, false);
  }, [mark, key, isDirty]);
}

/** A Next link that asks before abandoning unsaved changes. */
export function GuardedLink({
  href,
  children,
  onClick,
  ...props
}: Omit<ComponentProps<"a">, "href"> & { href: Route; prefetch?: boolean }) {
  const guard = useContext(GuardContext);
  const router = useRouter();
  return (
    <Link
      href={href}
      onClick={onClick}
      onNavigate={(event) => {
        if (!guard?.isDirty()) return;
        event.preventDefault();
        // Over the spare history entry, so Back from the next page comes straight here.
        const replace = guard.holdsSpareEntry();
        void guard.confirmLeave().then((ok) => {
          if (ok) (replace ? router.replace : router.push)(href);
        });
      }}
      {...props}
    >
      {children}
    </Link>
  );
}
