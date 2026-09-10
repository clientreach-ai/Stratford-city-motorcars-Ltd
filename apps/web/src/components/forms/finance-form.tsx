"use client";

import { useActionState } from "react";

import {
  Checkbox,
  Field,
  fieldProps,
  Honeypot,
  Input,
  Select,
  Textarea,
} from "@/components/ui/field";
import { submitFinanceEnquiry } from "@/lib/forms/actions";
import { EMPLOYMENT_STATUSES, type FormState } from "@/lib/forms/options";
import { site } from "@/lib/site";
import { DirectContactNote, SuccessPanel, UnavailablePanel } from "./form-feedback";
import { SubmitButton } from "./submit-button";

const initial: FormState = { status: "idle" };

export function FinanceForm({ defaultVehicle }: { defaultVehicle?: string }) {
  const [state, action] = useActionState(submitFinanceEnquiry, initial);

  if (state.status === "success") {
    return (
      <SuccessPanel
        reference={state.reference}
        heading="Finance enquiry received"
        detail="We'll put your details to our lending partners and come back to you with the options actually available to you — usually the same working day."
      />
    );
  }

  const errors = state.status === "invalid" ? state.fieldErrors : undefined;
  const values =
    state.status === "invalid" || state.status === "unavailable" ? state.values : {};

  return (
    <form action={action} className="relative space-y-5" noValidate>
      <Honeypot />

      {state.status === "unavailable" ? (
        <UnavailablePanel message={state.message} />
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" name="name" required error={errors?.name}>
          <Input
            {...fieldProps("name", errors?.name)}
            defaultValue={values.name}
            autoComplete="name"
            required
          />
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
        label="Vehicle you're interested in"
        name="vehicle"
        error={errors?.vehicle}
        hint="Leave blank if you're still deciding — we can help you choose."
      >
        <Input
          {...fieldProps("vehicle", errors?.vehicle, "Optional")}
          defaultValue={values.vehicle ?? defaultVehicle}
          placeholder="e.g. 2016 Mercedes-Benz SL63 AMG"
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Deposit available"
          name="deposit"
          error={errors?.deposit}
          hint="In pounds"
        >
          <Input
            {...fieldProps("deposit", errors?.deposit, "In pounds")}
            type="number"
            inputMode="numeric"
            min={0}
            step={100}
            defaultValue={values.deposit}
            placeholder="3000"
          />
        </Field>

        <Field
          label="Monthly budget"
          name="monthlyBudget"
          error={errors?.monthlyBudget}
          hint="Roughly what you'd be comfortable with"
        >
          <Input
            {...fieldProps(
              "monthlyBudget",
              errors?.monthlyBudget,
              "Roughly what you'd be comfortable with",
            )}
            type="number"
            inputMode="numeric"
            min={0}
            step={25}
            defaultValue={values.monthlyBudget}
            placeholder="450"
          />
        </Field>
      </div>

      <Field
        label="Employment status"
        name="employmentStatus"
        error={errors?.employmentStatus}
      >
        <Select
          {...fieldProps("employmentStatus", errors?.employmentStatus)}
          defaultValue={values.employmentStatus ?? ""}
        >
          <option value="">Prefer not to say</option>
          {EMPLOYMENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Anything else we should know?" name="message" error={errors?.message}>
        <Textarea
          {...fieldProps("message", errors?.message)}
          defaultValue={values.message}
          rows={3}
        />
      </Field>

      <label
        htmlFor="hasPartExchange"
        className="flex cursor-pointer items-start gap-3 border-t border-[var(--border)] pt-5 text-sm"
      >
        <Checkbox id="hasPartExchange" name="hasPartExchange" className="mt-0.5" />
        <span>I have a car to part exchange</span>
      </label>

      <SubmitButton className="w-full">Get finance options</SubmitButton>

      <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
        {site.compliance.creditBroker} {site.compliance.financeSubjectToStatus} We
        will never run a credit check without telling you first.
      </p>

      <DirectContactNote />
    </form>
  );
}
