"use client";

import { useActionState } from "react";

import {
  Field,
  fieldProps,
  Honeypot,
  Input,
  Select,
  Textarea,
} from "@/components/ui/field";
import { submitContact } from "@/lib/forms/actions";
import { ENQUIRY_TYPES, type FormState } from "@/lib/forms/options";
import { DirectContactNote, SuccessPanel, UnavailablePanel } from "./form-feedback";
import { SubmitButton } from "./submit-button";

const initial: FormState = { status: "idle" };

export function ContactForm() {
  const [state, action] = useActionState(submitContact, initial);

  if (state.status === "success") {
    return (
      <SuccessPanel
        reference={state.reference}
        heading="Message received"
        detail="Thanks for getting in touch — we'll come back to you as soon as we can, usually the same day."
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

        <Field label="Phone" name="phone" error={errors?.phone}>
          <Input
            {...fieldProps("phone", errors?.phone)}
            type="tel"
            inputMode="tel"
            defaultValue={values.phone}
            autoComplete="tel"
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
        label="What's it about?"
        name="enquiryType"
        required
        error={errors?.enquiryType}
      >
        <Select
          {...fieldProps("enquiryType", errors?.enquiryType)}
          defaultValue={values.enquiryType ?? ENQUIRY_TYPES[0]}
          required
        >
          {ENQUIRY_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Message" name="message" required error={errors?.message}>
        <Textarea
          {...fieldProps("message", errors?.message)}
          defaultValue={values.message}
          rows={5}
          placeholder="Tell us what you're looking for and we'll take it from there."
          required
        />
      </Field>

      <SubmitButton className="w-full">Send message</SubmitButton>

      <DirectContactNote />
    </form>
  );
}
