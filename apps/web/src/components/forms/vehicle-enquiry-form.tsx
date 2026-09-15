"use client";

import { useActionState, useEffect, useState } from "react";

import { Checkbox, Field, fieldProps, Honeypot, Input, Select, Textarea } from "@/components/ui/field";
import { submitVehicleEnquiry } from "@/lib/forms/actions";
import { PREFERRED_TIMES, REQUEST_TYPES, type FormState, type RequestType } from "@/lib/forms/options";
import { DirectContactNote, SuccessPanel, UnavailablePanel } from "./form-feedback";
import { SubmitButton } from "./submit-button";
import { useFormFeedbackFocus } from "./use-form-feedback";

const initial: FormState = { status: "idle" };

/** Links that open the form on a viewing request, e.g. the "Book a viewing" button. */
export const BOOK_VIEWING_HASH = "#book-viewing";

const SUCCESS_COPY: Record<RequestType, { heading: string; detail: string }> = {
  question: {
    heading: "Enquiry received",
    detail: "Thanks — we'll come back to you personally about this car.",
  },
  viewing: {
    heading: "Viewing request received",
    detail:
      "This is a request, not a confirmed booking. We'll call or WhatsApp you to agree a time before you travel.",
  },
  "test-drive": {
    heading: "Test drive request received",
    detail:
      "This is a request, not a confirmed booking. We'll call or WhatsApp you to agree a time and go through what you'll need to bring.",
  },
};

/**
 * One form for a question, a viewing request or a test-drive request about a
 * specific car. The client wants viewings and test drives bookable online "as a
 * request we confirm", so nothing here implies a confirmed slot, and a phone
 * number is required whenever a time needs agreeing.
 */
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
  const formRef = useFormFeedbackFocus(state);
  const values = state.status === "invalid" || state.status === "unavailable" ? state.values : {};
  const [requestType, setRequestType] = useState<RequestType>(
    (values.requestType as RequestType | undefined) ?? "question",
  );
  const [minDate, setMinDate] = useState<string>();

  useEffect(() => {
    setMinDate(new Date().toISOString().slice(0, 10));
    const fromHash = () => {
      if (window.location.hash === BOOK_VIEWING_HASH) setRequestType("viewing");
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  if (state.status === "success") {
    const copy = SUCCESS_COPY[requestType];
    return <SuccessPanel reference={state.reference} heading={copy.heading} detail={copy.detail} />;
  }

  const errors = state.status === "invalid" ? state.fieldErrors : undefined;
  const name = `${vehicleYear} ${vehicleTitle}`;
  const wantsTime = requestType !== "question";

  return (
    <form ref={formRef} action={action} className="relative space-y-5" noValidate>
      <Honeypot />
      <input type="hidden" name="vehicleSlug" value={vehicleSlug} />
      <input type="hidden" name="vehicleTitle" value={name} />
      {/*
        The submitted request type comes from state, not from the radios: React
        resets a form after its action runs, which can leave a radio's DOM
        state out of step with what the customer chose. The radios below use a
        separate name and only drive this value.
      */}
      <input type="hidden" name="requestType" value={requestType} />

      {state.status === "unavailable" ? <UnavailablePanel message={state.message} /> : null}

      <fieldset>
        <legend className="mb-3 font-roman text-[0.625rem] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          What would you like to do?
        </legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {REQUEST_TYPES.map((type) => (
            <label
              key={type.value}
              className="flex min-h-12 cursor-pointer items-center gap-3 border border-[var(--input)] px-3.5 text-sm transition-colors has-[:checked]:border-[var(--primary)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--ring)]"
            >
              <input
                type="radio"
                name="requestTypeChoice"
                value={type.value}
                checked={requestType === type.value}
                onChange={() => setRequestType(type.value)}
                className="size-4 shrink-0 accent-[var(--primary)]"
              />
              {type.label}
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Your name" name="name" required error={errors?.name}>
        <Input {...fieldProps("name", errors?.name)} defaultValue={values.name} autoComplete="name" required />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
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
          label="Phone"
          name="phone"
          required={wantsTime}
          error={errors?.phone}
          hint={wantsTime ? "So we can confirm a time with you." : "Optional, but usually the quickest way to reply."}
        >
          <Input
            {...fieldProps("phone", errors?.phone, wantsTime ? "So we can confirm a time with you." : "Optional")}
            type="tel"
            inputMode="tel"
            defaultValue={values.phone}
            autoComplete="tel"
            required={wantsTime}
          />
        </Field>
      </div>

      {wantsTime ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Preferred date" name="preferredDate" error={errors?.preferredDate} hint="We'll confirm by phone.">
            <Input
              {...fieldProps("preferredDate", errors?.preferredDate, "We'll confirm by phone.")}
              type="date"
              min={minDate}
              defaultValue={values.preferredDate}
            />
          </Field>
          <Field label="Preferred time" name="preferredTime" error={errors?.preferredTime}>
            <Select {...fieldProps("preferredTime", errors?.preferredTime)} defaultValue={values.preferredTime ?? ""}>
              <option value="">No preference</option>
              {PREFERRED_TIMES.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      ) : null}

      <Field
        label={wantsTime ? "Anything we should know?" : "Your question"}
        name="message"
        required={!wantsTime}
        error={errors?.message}
      >
        <Textarea
          {...fieldProps("message", errors?.message)}
          defaultValue={values.message}
          rows={4}
          placeholder={wantsTime ? "Optional" : `What would you like to know about the ${name}?`}
          required={!wantsTime}
        />
      </Field>

      <fieldset className="space-y-3 border-t border-[var(--border)] pt-5">
        <legend className="sr-only">Also interested in</legend>
        <label htmlFor="interestedInFinance" className="flex cursor-pointer items-start gap-3 text-sm">
          <Checkbox
            id="interestedInFinance"
            name="interestedInFinance"
            className="mt-0.5"
            defaultChecked={values.interestedInFinance === "on"}
          />
          <span>I&rsquo;d like to hear about finance</span>
        </label>
        <label htmlFor="hasPartExchange" className="flex cursor-pointer items-start gap-3 text-sm">
          <Checkbox
            id="hasPartExchange"
            name="hasPartExchange"
            className="mt-0.5"
            defaultChecked={values.hasPartExchange === "on"}
          />
          <span>I have a car to part exchange</span>
        </label>
      </fieldset>

      <SubmitButton className="w-full">
        {requestType === "question" ? "Send enquiry" : requestType === "viewing" ? "Request a viewing" : "Request a test drive"}
      </SubmitButton>

      <DirectContactNote />
    </form>
  );
}
