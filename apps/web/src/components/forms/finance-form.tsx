"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";

import { Checkbox, Field, fieldProps, Honeypot, Input } from "@/components/ui/field";
import { submitFinanceEnquiry } from "@/lib/forms/actions";
import type { FormState } from "@/lib/forms/options";
import { DirectContactNote, SuccessPanel, UnavailablePanel } from "./form-feedback";
import { SubmitButton } from "./submit-button";
import { humaniseSlug, useFormFeedbackFocus, validVehicleSlug } from "./use-form-feedback";

const initial: FormState = { status: "idle" };

/**
 * Finance enquiry. Shortened at the client's request: contact details, the car,
 * a deposit and a monthly budget. It asks nothing about income, employment or
 * credit history — no lender is set up to use it, and none of it is needed to
 * start a conversation.
 */
export function FinanceForm({ vehicleSlug }: { vehicleSlug?: string }) {
  const [state, action] = useActionState(submitFinanceEnquiry, initial);
  const formRef = useFormFeedbackFocus(state);

  if (state.status === "success") {
    return (
      <SuccessPanel
        reference={state.reference}
        heading="Finance enquiry received"
        detail="Thanks — we'll come back to you personally about your finance enquiry."
      />
    );
  }

  const errors = state.status === "invalid" ? state.fieldErrors : undefined;
  const values = state.status === "invalid" || state.status === "unavailable" ? state.values : {};
  const slug = values.vehicleSlug ?? vehicleSlug;

  return (
    <form ref={formRef} action={action} className="relative space-y-5" noValidate>
      <Honeypot />
      {slug ? <input type="hidden" name="vehicleSlug" value={slug} /> : null}

      {state.status === "unavailable" ? <UnavailablePanel message={state.message} /> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" name="name" required error={errors?.name}>
          <Input {...fieldProps("name", errors?.name)} defaultValue={values.name} autoComplete="name" required />
        </Field>
        <Field label="Phone" name="phone" required error={errors?.phone}>
          <Input
            {...fieldProps("phone", errors?.phone)}
            type="tel"
            inputMode="tel"
            defaultValue={values.phone}
            autoComplete="tel"
            required
          />
        </Field>
      </div>

      <Field label="Email" name="email" required error={errors?.email}>
        <Input
          {...fieldProps("email", errors?.email)}
          type="email"
          inputMode="email"
          defaultValue={values.email}
          autoComplete="email"
          required
        />
      </Field>

      <Field
        label="Car you're interested in"
        name="vehicle"
        error={errors?.vehicle}
        hint="Leave blank if you're still deciding — we can help you choose."
      >
        <Input
          {...fieldProps("vehicle", errors?.vehicle, "Optional")}
          defaultValue={values.vehicle ?? (slug ? humaniseSlug(slug) : undefined)}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Deposit available (£)" name="deposit" error={errors?.deposit}>
          <Input
            {...fieldProps("deposit", errors?.deposit)}
            type="number"
            inputMode="numeric"
            min={0}
            step={100}
            defaultValue={values.deposit}
          />
        </Field>
        <Field label="Monthly budget (£)" name="monthlyBudget" error={errors?.monthlyBudget}>
          <Input
            {...fieldProps("monthlyBudget", errors?.monthlyBudget)}
            type="number"
            inputMode="numeric"
            min={0}
            step={25}
            defaultValue={values.monthlyBudget}
          />
        </Field>
      </div>

      <label htmlFor="hasPartExchange" className="flex cursor-pointer items-start gap-3 border-t border-[var(--border)] pt-5 text-sm">
        <Checkbox id="hasPartExchange" name="hasPartExchange" className="mt-0.5" defaultChecked={values.hasPartExchange === "on"} />
        <span>I have a car to part exchange</span>
      </label>

      <SubmitButton className="w-full">Send finance enquiry</SubmitButton>
      <DirectContactNote />
    </form>
  );
}

/** Reads `?vehicle=<slug>` from a car's finance link. Render inside <Suspense>. */
export function FinanceFormFromLink() {
  const slug = validVehicleSlug(useSearchParams().get("vehicle"));
  return <FinanceForm vehicleSlug={slug} />;
}
