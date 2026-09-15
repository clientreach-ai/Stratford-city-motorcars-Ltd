import type { PublicVehicle, RepresentativeFinanceExample } from "./inventory/types";
import { site } from "./site";

/**
 * The representative example to show for a car, or `null`.
 *
 * A monthly figure is a financial promotion, so it needs both the firm's
 * approved FCA status statement (`site.finance.statusStatement`) and a complete
 * representative example on the car. Either missing means nothing is shown —
 * never a partial figure.
 */
export function financeExampleFor(
  vehicle: Pick<PublicVehicle, "financeExample" | "price" | "priceOnApplication" | "isSold">,
): RepresentativeFinanceExample | null {
  if (!site.finance.statusStatement) return null;
  if (vehicle.isSold || vehicle.priceOnApplication || vehicle.price === null) return null;
  return vehicle.financeExample ?? null;
}

export function financeStatusStatement(): string | null {
  return site.finance.statusStatement;
}
