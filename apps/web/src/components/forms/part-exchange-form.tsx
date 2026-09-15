"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";

import { ExternalButtonLink } from "@/components/ui/button";
import { Checkbox, Field, fieldProps, Honeypot, Input, Select, Textarea } from "@/components/ui/field";
import { WhatsAppIcon } from "@/components/ui/icons";
import { submitPartExchange } from "@/lib/forms/actions";
import {
  KEY_COUNTS,
  MOT_STATUSES,
  SERVICE_HISTORY_OPTIONS,
  VEHICLE_CONDITIONS,
  type FormState,
} from "@/lib/forms/options";
import { site } from "@/lib/site";
import { whatsappLinks } from "@/lib/whatsapp";
import { DirectContactNote, SuccessPanel, UnavailablePanel } from "./form-feedback";
import { SubmitButton } from "./submit-button";
import { humaniseSlug, useFormFeedbackFocus, validVehicleSlug } from "./use-form-feedback";

const initial: FormState = { status: "idle" };

/**
 * Part-exchange valuation request — exactly the details the dealership said it
 * needs: registration, make, model, year, mileage, service history, MOT status,
 * number of keys, condition, outstanding finance, and photos (sent on WhatsApp,
 * where the business already handles them, rather than uploaded here).
 */
export function PartExchangeForm({ vehicleSlug }: { vehicleSlug?: string }) {
  const [state, action] = useActionState(submitPartExchange, initial);
  const formRef = useFormFeedbackFocus(state);

  if (state.status === "success") {
    return (
      <SuccessPanel
        reference={state.reference}
        heading="Valuation request received"
        detail="We'll usually come back within 24 hours on weekdays with an initial figure. Send a few photos on WhatsApp to help us, and bring the car in so we can confirm it in person."
      />
    );
  }

  const errors = state.status === "invalid" ? state.fieldErrors : undefined;
  const values = state.status === "invalid" || state.status === "unavailable" ? state.values : {};
  const slug = values.vehicleSlug ?? vehicleSlug;

  return (
    <form ref={formRef} action={action} className="relative space-y-8" noValidate>
      <Honeypot />
      {slug ? <input type="hidden" name="vehicleSlug" value={slug} /> : null}

      {state.status === "unavailable" ? <UnavailablePanel message={state.message} /> : null}

      <fieldset className="space-y-5">
        <Legend>Your car</Legend>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Registration" name="registration" required error={errors?.registration}>
            <Input
              {...fieldProps("registration", errors?.registration)}
              defaultValue={values.registration}
              autoCapitalize="characters"
              autoComplete="off"
              className="uppercase"
              required
            />
          </Field>
          <Field label="Year" name="year" required error={errors?.year}>
            <Input
              {...fieldProps("year", errors?.year)}
              type="number"
              inputMode="numeric"
              min={1900}
              max={new Date().getFullYear() + 1}
              defaultValue={values.year}
              required
            />
          </Field>
          <Field label="Mileage" name="mileage" required error={errors?.mileage}>
            <Input
              {...fieldProps("mileage", errors?.mileage)}
              type="number"
              inputMode="numeric"
              min={0}
              defaultValue={values.mileage}
              required
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Make" name="make" required error={errors?.make}>
            <Input {...fieldProps("make", errors?.make)} defaultValue={values.make} required />
          </Field>
          <Field label="Model" name="model" required error={errors?.model}>
            <Input {...fieldProps("model", errors?.model)} defaultValue={values.model} required />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <ChoiceField label="Service history" name="serviceHistory" options={SERVICE_HISTORY_OPTIONS} values={values} errors={errors} />
          <ChoiceField label="MOT" name="motStatus" options={MOT_STATUSES} values={values} errors={errors} />
          <ChoiceField label="Number of keys" name="keys" options={KEY_COUNTS} values={values} errors={errors} />
          <ChoiceField label="Overall condition" name="condition" options={VEHICLE_CONDITIONS} values={values} errors={errors} />
        </div>

        <Field
          label="Condition notes"
          name="conditionNotes"
          error={errors?.conditionNotes}
          hint="Anything we should know — kerbed alloys, a stone chip, a warning light, modifications. Being upfront keeps the figure accurate."
        >
          <Textarea
            {...fieldProps("conditionNotes", errors?.conditionNotes, "Anything we should know")}
            defaultValue={values.conditionNotes}
            rows={3}
          />
        </Field>

        <label htmlFor="outstandingFinance" className="flex cursor-pointer items-start gap-3 text-sm">
          <Checkbox
            id="outstandingFinance"
            name="outstandingFinance"
            className="mt-0.5"
            defaultChecked={values.outstandingFinance === "on"}
          />
          <span>There&rsquo;s outstanding finance on this car</span>
        </label>

        <div className="flex flex-wrap items-center gap-3 border-l border-[var(--rule)] pl-4 text-sm text-[var(--muted-foreground)]">
          <span>Photos help us give a more accurate figure.</span>
          <ExternalButtonLink
            href={whatsappLinks.partExchange}
            target="_blank"
            rel="noopener noreferrer"
            variant="outline"
            size="sm"
          >
            <WhatsAppIcon className="size-4" />
            Send photos on WhatsApp
          </ExternalButtonLink>
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <Legend>How to reach you</Legend>

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

        <Field label="Which of our cars are you interested in?" name="interestedIn" error={errors?.interestedIn}>
          <Input
            {...fieldProps("interestedIn", errors?.interestedIn, "Optional")}
            defaultValue={values.interestedIn ?? (slug ? humaniseSlug(slug) : undefined)}
          />
        </Field>
      </fieldset>

      <SubmitButton className="w-full">Get my valuation</SubmitButton>

      <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
        {site.compliance.partExchangeSubjectToInspection} Any outstanding finance must be disclosed and settled
        before a part exchange completes.
      </p>

      <DirectContactNote />
    </form>
  );
}

/** Reads `?vehicle=<slug>` from a car's part-exchange link. Render inside <Suspense>. */
export function PartExchangeFormFromLink() {
  const slug = validVehicleSlug(useSearchParams().get("vehicle"));
  return <PartExchangeForm vehicleSlug={slug} />;
}

function Legend({ children }: { children: React.ReactNode }) {
  return (
    <legend className="mb-5 w-full border-b border-[var(--border)] pb-3 font-roman text-[0.625rem] uppercase tracking-[0.22em] text-[var(--rule)]">
      {children}
    </legend>
  );
}

function ChoiceField({
  label,
  name,
  options,
  values,
  errors,
}: {
  label: string;
  name: string;
  options: readonly string[];
  values: Record<string, string>;
  errors?: Record<string, string[]>;
}) {
  return (
    <Field label={label} name={name} required error={errors?.[name]}>
      <Select {...fieldProps(name, errors?.[name])} defaultValue={values[name] ?? ""} required>
        <option value="" disabled>
          Choose…
        </option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
    </Field>
  );
}
