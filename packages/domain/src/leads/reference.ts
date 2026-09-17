import { randomInt } from "node:crypto";

/** Short, human-quotable reference, e.g. SCM-8F2K4Q. No ambiguous characters. */
export function createLeadReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i += 1) suffix += alphabet[randomInt(alphabet.length)];
  return `SCM-${suffix}`;
}
