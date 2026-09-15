import { site } from "./site";

/**
 * ============================================================================
 * INTEGRATION POINT — online reservations (card deposit).
 * ============================================================================
 *
 * The client wants buyers to reserve a car with a £100–£500 card deposit.
 * Nothing is taken today and nothing on the site offers it: taking a deposit
 * needs a payment provider account (for example Stripe Checkout), a confirmed
 * deposit amount, and approved refund and cancellation terms in the
 * Terms & Conditions.
 *
 * To switch it on once those exist:
 *  1. set `site.reservations.enabled` and `depositGbp` in `site.ts`
 *  2. set `RESERVATION_CHECKOUT_URL` to a provider-hosted checkout route that
 *     accepts `?vehicle=<slug>` and creates the payment server-side
 *  3. have the provider's webhook mark the car `reserved` via the dashboard
 *     store, and publish the reservation terms
 *
 * Until all three are true, `reservationOffer()` returns null and the reserve
 * panel renders nothing.
 */
export interface ReservationOffer {
  depositGbp: number;
  checkoutUrl: string;
}

export function reservationOffer(vehicle: { slug: string; isSold: boolean; reserved: boolean }): ReservationOffer | null {
  const checkout = process.env.RESERVATION_CHECKOUT_URL?.trim();
  const { enabled, depositGbp } = site.reservations;
  if (!enabled || !depositGbp || !checkout) return null;
  if (vehicle.isSold || vehicle.reserved) return null;
  if (!/^https:\/\//.test(checkout)) return null;

  const url = new URL(checkout);
  url.searchParams.set("vehicle", vehicle.slug);
  return { depositGbp, checkoutUrl: url.toString() };
}
