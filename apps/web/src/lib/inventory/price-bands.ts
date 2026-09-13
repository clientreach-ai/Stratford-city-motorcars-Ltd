/**
 * "Up to £X" ceilings for the homepage search, derived from the prices of the
 * cars actually listed. Every ceiling is at or above the cheapest car, so each
 * option returns at least one result, and the last one covers the dearest car.
 *
 * Deriving them keeps the options correct as stock changes — hardcoded bands
 * went stale (a £15,000 band below every car; a £60,000 ceiling below the
 * client's £1,000,000 range). No stock means no bands.
 */
export function priceCeilings(prices: number[], count = 4): number[] {
  if (prices.length === 0) return [];

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const step = niceStep((max - min) / count, max);

  const ceilings: number[] = [];
  for (let value = Math.ceil(min / step) * step; value < max + step; value += step) {
    ceilings.push(value);
  }
  return ceilings.slice(0, count + 1);
}

/** Rounds a raw step up to 1, 2 or 5 × a power of ten, e.g. 12,500 → 20,000. */
function niceStep(raw: number, max: number): number {
  // A single price (or identical prices) still gets one sensible ceiling.
  const target = raw > 0 ? raw : Math.max(max, 1);
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const leading = target / magnitude;
  const nice = leading <= 1 ? 1 : leading <= 2 ? 2 : leading <= 5 ? 5 : 10;
  return nice * magnitude;
}
