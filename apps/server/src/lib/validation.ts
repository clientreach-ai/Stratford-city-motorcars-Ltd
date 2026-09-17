import { ValidationError } from "@Stratford-city-motorcars-Ltd/core/errors";
import type { ValidationTargets } from "hono";
import { validator } from "hono/validator";
import type { z } from "zod";

import { HttpError } from "./http";

/**
 * Validates one part of the request with a Zod schema and exposes the parsed
 * value through `c.req.valid(target)`. Failures become a 422 `ValidationError`
 * with one message per field path, so a form can show each beside its field.
 */
export function validate<Target extends keyof ValidationTargets, Schema extends z.ZodType>(
  target: Target,
  schema: Schema,
) {
  return validator(target, async (value, c): Promise<z.output<Schema>> => {
    if (target === "json" && !isJson(c.req.header("content-type"))) {
      throw new HttpError(415, "unsupported_media_type", "Send the request body as application/json.");
    }
    const result = await schema.safeParseAsync(value);
    if (!result.success) throw toValidationError(result.error);
    return result.data;
  });
}

function isJson(contentType: string | undefined): boolean {
  return !!contentType && /^application\/([\w.+-]*\+)?json\b/i.test(contentType);
}

/** `{ "price": "…", "hours.closes": "…" }` — the first message per path; the root is keyed as `_`. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.map(String).join(".") : "_";
    errors[key] ??= issue.message;
  }
  return errors;
}

export function toValidationError(error: z.ZodError, message?: string): ValidationError {
  return new ValidationError(fieldErrors(error), message);
}
