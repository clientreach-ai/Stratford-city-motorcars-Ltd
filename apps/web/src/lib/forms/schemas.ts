import { z } from "zod";

import {
  EMPLOYMENT_STATUSES,
  ENQUIRY_TYPES,
  SERVICE_HISTORY_OPTIONS,
  VEHICLE_CONDITIONS,
} from "./options";

/**
 * Server-side validation. Messages are written to be read by a customer, not a
 * developer.
 *
 * This module is never imported by a client component — option lists and the
 * result type live in `options.ts` precisely so Zod stays out of the browser
 * bundle.
 */

const name = z
  .string()
  .trim()
  .min(2, "Please enter your name")
  .max(80, "That name looks too long");

const email = z
  .string()
  .trim()
  .min(1, "Please enter your email address")
  .email("That doesn't look like a valid email address")
  .max(160);

/** Forgiving on formatting — UK numbers get written a dozen different ways. */
const phone = z
  .string()
  .trim()
  .min(1, "Please enter a phone number")
  .refine(
    (value) => value.replace(/[^\d]/g, "").length >= 10,
    "Please enter a valid UK phone number",
  )
  .refine(
    (value) => /^[\d\s()+-]+$/.test(value),
    "Phone numbers can only contain digits, spaces and + ( ) -",
  );

const optionalPhone = z
  .union([z.literal(""), phone])
  .optional()
  .transform((value) => (value === "" ? undefined : value));

const message = z
  .string()
  .trim()
  .max(2000, "Please keep your message under 2000 characters");

/** Honeypot — real customers never fill this; bots usually do. */
const honeypot = z
  .string()
  .max(0, "This submission was rejected")
  .optional()
  .or(z.literal(""));

const positiveMoney = z
  .union([z.literal(""), z.coerce.number().min(0, "Please enter a positive amount").max(10_000_000)])
  .optional()
  .transform((value) => (value === "" || value === undefined ? undefined : Number(value)));

// ---- Vehicle enquiry ------------------------------------------------------

export const vehicleEnquirySchema = z.object({
  kind: z.literal("vehicle-enquiry"),
  name,
  email,
  phone: optionalPhone,
  message: message.optional(),
  /** Set from the page, not typed by the customer. */
  vehicleSlug: z.string().min(1),
  vehicleTitle: z.string().min(1),
  interestedInFinance: z.coerce.boolean().optional(),
  hasPartExchange: z.coerce.boolean().optional(),
  website: honeypot,
});

export type VehicleEnquiryInput = z.infer<typeof vehicleEnquirySchema>;

// ---- Finance --------------------------------------------------------------

export const financeSchema = z.object({
  kind: z.literal("finance"),
  name,
  email,
  phone,
  vehicle: z.string().trim().max(160).optional(),
  deposit: positiveMoney,
  monthlyBudget: positiveMoney,
  employmentStatus: z.enum(EMPLOYMENT_STATUSES).optional(),
  hasPartExchange: z.coerce.boolean().optional(),
  message: message.optional(),
  website: honeypot,
});

export type FinanceInput = z.infer<typeof financeSchema>;

// ---- Part exchange --------------------------------------------------------

const currentYear = new Date().getFullYear();

export const partExchangeSchema = z.object({
  kind: z.literal("part-exchange"),
  name,
  email,
  phone,
  make: z.string().trim().min(1, "Please enter the make").max(60),
  model: z.string().trim().min(1, "Please enter the model").max(60),
  registration: z
    .string()
    .trim()
    .min(2, "Please enter the registration")
    .max(12, "That registration looks too long")
    .regex(/^[A-Za-z0-9 ]+$/, "Registrations use letters, numbers and spaces only"),
  year: z.coerce
    .number()
    .int()
    .min(1900, "Please enter a valid year")
    .max(currentYear + 1, "Please enter a valid year"),
  mileage: z.coerce
    .number()
    .int()
    .min(0, "Please enter the mileage")
    .max(1_000_000, "Please enter a valid mileage"),
  fuel: z.string().trim().min(1, "Please choose a fuel type"),
  transmission: z.string().trim().min(1, "Please choose a transmission"),
  serviceHistory: z.enum(SERVICE_HISTORY_OPTIONS),
  condition: z.enum(VEHICLE_CONDITIONS),
  modifications: z.string().trim().max(500).optional(),
  outstandingFinance: z.coerce.boolean().optional(),
  message: message.optional(),
  website: honeypot,
});

export type PartExchangeInput = z.infer<typeof partExchangeSchema>;

// ---- General contact ------------------------------------------------------

export const contactSchema = z.object({
  kind: z.literal("contact"),
  name,
  email,
  phone: optionalPhone,
  enquiryType: z.enum(ENQUIRY_TYPES),
  message: message.min(10, "Please tell us a little more so we can help"),
  website: honeypot,
});

export type ContactInput = z.infer<typeof contactSchema>;

// ---- Union ----------------------------------------------------------------

export type LeadInput =
  | VehicleEnquiryInput
  | FinanceInput
  | PartExchangeInput
  | ContactInput;

export type LeadKind = LeadInput["kind"];

export type { FormState } from "./options";
