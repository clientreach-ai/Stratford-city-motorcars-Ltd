import { SORT_OPTIONS } from "@Stratford-city-motorcars-Ltd/core/vehicle";
import { z } from "zod";

/** Query and path shapes for the public vehicle endpoints. */

export const slugParam = z.object({
  slug: z.string().min(1).max(160).regex(/^[a-z0-9-]+$/),
});

const csv = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    const list = (Array.isArray(value) ? value : value ? [value] : [])
      .flatMap((entry) => entry.split(","))
      .map((entry) => entry.trim())
      .filter(Boolean);
    return list.length ? list.slice(0, 20) : undefined;
  });

export const publicSearchQuery = z.object({
  make: csv,
  model: csv,
  sort: z.enum(SORT_OPTIONS.map((option) => option.value) as [string, ...string[]]).optional(),
});

export const limitQuery = (fallback: number, max: number) =>
  z.object({ limit: z.coerce.number().int().min(1).max(max).default(fallback) });
