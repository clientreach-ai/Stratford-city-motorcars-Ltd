import { formatEngineSize, formatMileage, formatMonthYear, formatNumber } from "@/lib/format";
import type { PublicVehicle } from "@/lib/inventory/types";

/**
 * The full specification table, in the order the client listed what every
 * listing should show. A row renders only when the dealership has supplied the
 * value — an empty row, or a guess, is worse than no row.
 */
export function VehicleSpecification({ vehicle }: { vehicle: PublicVehicle }) {
  const rows: { term: string; value: string | undefined }[] = [
    { term: "Make", value: vehicle.make },
    { term: "Model", value: vehicle.model },
    { term: "Variant", value: vehicle.variant },
    { term: "Year", value: String(vehicle.year) },
    {
      term: "First registered",
      value: vehicle.registrationDate ? formatMonthYear(vehicle.registrationDate) : undefined,
    },
    { term: "Mileage", value: formatMileage(vehicle.mileage) },
    { term: "Gearbox", value: vehicle.transmission },
    { term: "Fuel", value: vehicle.fuel },
    { term: "Body style", value: vehicle.bodyType },
    { term: "Colour", value: vehicle.colour },
    { term: "Engine size", value: vehicle.engineSizeCc ? formatEngineSize(vehicle.engineSizeCc) : undefined },
    { term: "Engine", value: vehicle.engine },
    { term: "Power", value: vehicle.power },
    {
      term: "Previous owners",
      value: vehicle.previousOwners !== undefined ? formatNumber(vehicle.previousOwners) : undefined,
    },
    { term: "Interior", value: vehicle.interior },
    { term: "Doors", value: vehicle.doors ? String(vehicle.doors) : undefined },
    { term: "Seats", value: vehicle.seats ? String(vehicle.seats) : undefined },
    { term: "Insurance group", value: vehicle.insuranceGroup },
    { term: "Road tax band", value: vehicle.roadTaxBand },
    { term: "Registration", value: vehicle.registration },
  ];

  return (
    <dl className="mt-5 grid gap-x-12 sm:grid-cols-2">
      {rows
        .filter((row): row is { term: string; value: string } => Boolean(row.value))
        .map((row) => (
          <div
            key={row.term}
            className="flex justify-between gap-6 border-b border-[var(--border)] py-3.5 text-sm"
          >
            <dt className="text-[var(--muted-foreground)]">{row.term}</dt>
            <dd data-numeric className="text-right font-medium">
              {row.value}
            </dd>
          </div>
        ))}
    </dl>
  );
}
