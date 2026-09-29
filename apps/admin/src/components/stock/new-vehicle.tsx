"use client";

import type { AdminVehicle } from "@Stratford-city-motorcars-Ltd/core";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { routes } from "@/components/shell/routes";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingBlock, Notice, PageBody, PageHeader } from "@/components/ui/page";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query";

/**
 * The draft on its way, shared by every mount of this page: React mounts
 * twice in development, and leaving and coming back while a sleeping API
 * wakes must not start a second draft.
 */
let creating: Promise<AdminVehicle> | null = null;

/**
 * When a draft was asked for, kept in the tab until it arrives. A reload in
 * the meantime cannot follow the request, but can tell there was one.
 */
const STARTED_KEY = "scm-admin:creating-draft";
/** Longer than any request is waited for. */
const STILL_RELEVANT = 2 * 60_000;

function recall(): number | null {
  try {
    const at = Number(window.sessionStorage.getItem(STARTED_KEY));
    return at && Date.now() - at < STILL_RELEVANT ? at : null;
  } catch {
    return null;
  }
}

function remember(at: number | null) {
  try {
    if (at) window.sessionStorage.setItem(STARTED_KEY, String(at));
    else window.sessionStorage.removeItem(STARTED_KEY);
  } catch {
    // Only a safeguard; creating the draft does not depend on it.
  }
}

function startDraft(): Promise<AdminVehicle> {
  remember(Date.now());
  creating = api.stock.create().finally(() => {
    remember(null);
    creating = null;
  });
  return creating;
}

/**
 * The draft asked for before a reload, if it arrived: still empty, created
 * no earlier than the request (allowing for the server's clock).
 */
async function findDraft(startedAt: number): Promise<AdminVehicle | null> {
  const vehicles = await api.stock.list();
  const candidates = vehicles.filter(
    (vehicle) =>
      vehicle.status === "draft" &&
      !vehicle.title &&
      !vehicle.make &&
      !vehicle.model &&
      vehicle.media.length === 0 &&
      Date.parse(vehicle.createdAt) >= startedAt - 60_000,
  );
  return candidates.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}

/**
 * Adding a car creates an empty draft straight away and opens it, so
 * photographs can be uploaded against it from the first minute. A draft is
 * never on the website.
 */
export function NewVehicle() {
  const router = useRouter();
  const client = useQueryClient();
  const [error, setError] = useState<Error | null>(null);
  const [interrupted, setInterrupted] = useState(false);

  const open = (vehicle: AdminVehicle) => {
    client.setQueryData(queryKeys.vehicle(vehicle.id), vehicle);
    void client.invalidateQueries({ queryKey: queryKeys.stock });
    router.replace(routes.vehicle(vehicle.id));
  };

  const follow = (request: Promise<AdminVehicle>) =>
    request.then(open).catch((caught: unknown) => setError(caught instanceof Error ? caught : new Error("The draft could not be created.")));

  const create = () => {
    setError(null);
    setInterrupted(false);
    void follow(creating ?? startDraft());
  };

  useEffect(() => {
    if (creating) {
      void follow(creating);
      return;
    }
    const startedAt = recall();
    if (startedAt === null) {
      create();
      return;
    }
    // Reloaded while a draft was being created: open it if it arrived, and
    // otherwise ask, rather than quietly adding a second.
    findDraft(startedAt)
      .then((found) => {
        remember(null);
        if (found) open(found);
        else setInterrupted(true);
      })
      .catch(() => setInterrupted(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on arrival
  }, []);

  return (
    <PageBody>
      {error ? (
        <>
          <PageHeader back={{ label: "Cars", href: routes.stock }} title="Add a car" />
          <ErrorState error={error} onRetry={create} title="The draft could not be created" />
        </>
      ) : interrupted ? (
        <>
          <PageHeader back={{ label: "Cars", href: routes.stock }} title="Add a car" />
          <Notice
            tone="warning"
            title="This page was reloaded while a draft was being created"
            action={
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => router.push(routes.stock)}>
                  Check the cars
                </Button>
                <Button size="sm" variant="primary" onClick={create}>
                  Create a new draft
                </Button>
              </div>
            }
          >
            It may have been created anyway. Look for an untitled draft in the list before starting another, so there are not two.
          </Notice>
        </>
      ) : (
        <LoadingBlock label="Creating a draft" />
      )}
    </PageBody>
  );
}
