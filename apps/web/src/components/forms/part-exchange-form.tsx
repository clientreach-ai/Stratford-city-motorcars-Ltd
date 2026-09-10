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
import { submitPartExchange } from "@/lib/forms/actions";
import {
  SERVICE_HISTORY_OPTIONS,
  VEHICLE_CONDITIONS,
  type FormState,
} from "@/lib/forms/options";
import { site } from "@/lib/site";
import { DirectContactNote, SuccessPanel, UnavailablePanel } from "./form-feedback";
import { SubmitButton } from "./submit-button";

const initial: FormState = { status: "idle" };

const FUELS = ["Petrol", "Diesel", "Hybrid", "Plug-in Hybrid", "Electric"];
const TRANSMISSIONS = ["Automatic", "Manual", "Semi-Automatic"];

export function PartExchangeForm() {
  const [state, action] = useActionState(submitPartExchange, initial);

  if (state.status === "success") {
    return (
      <SuccessPanel
        reference={state.reference}
        heading="Valuation request received"
        detail="We'll come back to you within 24 hours with an initial figure. Bring the car in and we'll confirm it in person."
      />
    );
  }

  const errors = state.status === "invalid" ? state.fieldErrors : undefined;
  const values =
    state.status === "invalid" || state.status === "unavailable" ? state.values : {};

  return (
    <form action={action} className="relative space-y-8" noValidate>
      <Honeypot />

      {state.status === "unavailable" ? (
        <UnavailablePanel message={state.message} />
      ) : null}

      <fieldset className="space-y-5">
        <legend className="mb-5 w-full border-b border-[var(--border)] pb-3 font-roman text-[0.625rem] uppercase tracking-[0.22em] text-[var(--rule)]">
          Your vehicle
        </legend>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Make" name="make" required error={errors?.make}>
            <Input
              {...fieldProps("make", errors?.make)}
              defaultValue={values.make}
              placeholder="e.g. BMW"
              required
            />
          </Field>

          <Field label="Model" name="model" required error={errors?.model}>
            <Input
              {...fieldProps("model", errors?.model)}
              defaultValue={values.model}
              placeholder="e.g. 320d M Sport"
              required
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field
            label="Registration"
            name="registration"
            required
            error={errors?.registration}
          >
            <Input
              {...fieldProps("registration", errors?.registration)}
              defaultValue={values.registration}
              placeholder="AB12 CDE"
              autoCapitalize="characters"
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
              placeholder="2018"
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
              placeholder="54000"
              required
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Fuel" name="fuel" required error={errors?.fuel}>
            <Select
              {...fieldProps("fuel", errors?.fuel)}
              defaultValue={values.fuel ?? ""}
              required
            >
              <option value="">Choose…</option>
              {FUELS.map((fuel) => (
                <option key={fuel} value={fuel}>
                  {fuel}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Transmission"
            name="transmission"
            required
            error={errors?.transmission}
          >
            <Select
              {...fieldProps("transmission", errors?.transmission)}
              defaultValue={values.transmission ?? ""}
              required
            >
              <option value="">Choose…</option>
              {TRANSMISSIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Service history"
            name="serviceHistory"
            required
            error={errors?.serviceHistory}
          >
            <Select
              {...fieldProps("serviceHistory", errors?.serviceHistory)}
              defaultValue={values.serviceHistory ?? ""}
              required
            >
              <option value="">Choose…</option>
              {SERVICE_HISTORY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Condition" name="condition" required error={errors?.condition}>
            <Select
              {...fieldProps("condition", errors?.condition)}
              defaultValue={values.condition ?? ""}
              required
            >
              <option value="">Choose…</option>
              {VEHICLE_CONDITIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label="Modifications or damage"
          name="modifications"
          error={errors?.modifications}
          hint="Anything we should know — kerbed alloys, a stone chip, aftermarket parts. Being upfront keeps the valuation accurate."
        >
          <Textarea
            {...fieldProps("modifications", errors?.modifications, "Anything we should know")}
            defaultValue={values.modifications}
            rows={3}
          />
        </Field>

        <label
          htmlFor="outstandingFinance"
          className="flex cursor-pointer items-start gap-3 text-sm"
        >
          <Checkbox id="outstandingFinance" name="outstandingFinance" className="mt-0.5" />
          <span>There&rsquo;s outstanding finance on this vehicle</span>
        </label>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="mb-5 w-full border-b border-[var(--border)] pb-3 font-roman text-[0.625rem] uppercase tracking-[0.22em] text-[var(--rule)]">
          How to reach you
        </legend>

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
          label="Which of our cars are you interested in?"
          name="message"
          error={errors?.message}
        >
          <Textarea
            {...fieldProps("message", errors?.message)}
            defaultValue={values.message}
            rows={3}
            placeholder="Optional — tell us what you'd like to move into."
          />
        </Field>
      </fieldset>

      <SubmitButton className="w-full">Get my valuation</SubmitButton>

      <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
        {site.compliance.partExchangeSubjectToInspection} Any outstanding finance
        must be disclosed and settled before a part exchange completes.
      </p>

      <DirectContactNote />
    </form>
  );
}
