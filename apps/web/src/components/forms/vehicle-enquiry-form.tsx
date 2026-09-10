"use client";

import { useActionState } from "react";

import { Checkbox, Field, fieldProps, Honeypot, Input, Textarea } from "@/components/ui/field";
import { submitVehicleEnquiry } from "@/lib/forms/actions";
import type { FormState } from "@/lib/forms/options";
import { DirectContactNote, SuccessPanel, UnavailablePanel } from "./form-feedback";
import { SubmitButton } from "./submit-button";

const initial: FormState = { status: "idle" };

export function VehicleEnquiryForm({
  vehicleSlug,
  vehicleTitle,
  vehicleYear,
}: {
  vehicleSlug: string;
  vehicleTitle: string;
  vehicleYear: number;
}) {
  const [state, action] = useActionState(submitVehicleEnquiry, initial);

  if (state.status === "success") {
    return (
      <SuccessPanel
        reference={state.reference}
        heading="Enquiry received"
        detail={`Thanks — we've got your enquiry about the ${vehicleYear} ${vehicleTitle} and will come back to you shortly.`}
      />
    );
  }

  const errors = state.status === "invalid" ? state.fieldErrors : undefined;
  const values = state.status === "invalid" || state.status === "unavailable" ? state.values : {};

  return (
    <form action={action} className="relative space-y-5" noValidate>
      <Honeypot />
      <input type="hidden" name="vehicleSlug" value={vehicleSlug} />
      <input type="hidden" name="vehicleTitle" value={`${vehicleYear} ${vehicleTitle}`} />

      {state.status === "unavailable" ? (
        <UnavailablePanel message={state.message} />
      ) : null}

      <Field label="Your name" name="name" required error={errors?.name}>
        <Input
          {...fieldProps("name", errors?.name)}
          defaultValue={values.name}
          autoComplete="name"
          required
        />
      </Field>

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

      <Field label="Phone" name="phone" error={errors?.phone} hint="Optional, but it's usually the quickest way to sort things out.">
        <Input
          {...fieldProps("phone", errors?.phone, "Optional")}
          type="tel"
          inputMode="tel"
          defaultValue={values.phone}
          autoComplete="tel"
        />
      </Field>

      <Field label="Message" name="message" error={errors?.message}>
        <Textarea
          {...fieldProps("message", errors?.message)}
          defaultValue={values.message}
          rows={4}
          placeholder={`I'd like to know more about the ${vehicleYear} ${vehicleTitle}…`}
        />
      </Field>

      <fieldset className="space-y-3 border-t border-[var(--border)] pt-5">
        <legend className="sr-only">Additional interest</legend>
        <label htmlFor="interestedInFinance" className="flex cursor-pointer items-start gap-3 text-sm">
          <Checkbox id="interestedInFinance" name="interestedInFinance" className="mt-0.5" />
          <span>I&rsquo;d like to hear about finance options</span>
        </label>
        <label htmlFor="hasPartExchange" className="flex cursor-pointer items-start gap-3 text-sm">
          <Checkbox id="hasPartExchange" name="hasPartExchange" className="mt-0.5" />
          <span>I have a car to part exchange</span>
        </label>
      </fieldset>

      <SubmitButton className="w-full">Send enquiry</SubmitButton>

      <DirectContactNote />
    </form>
  );
}
