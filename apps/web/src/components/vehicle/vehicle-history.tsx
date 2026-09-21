import { BadgeCheck, Car, FileText, ShieldCheck, Wrench } from "lucide-react";

import { formatDate, formatMileage } from "@/lib/format";
import type { PublicVehicle } from "@/lib/inventory/types";
import { site } from "@/lib/site";

/**
 * History, checks and cover. Every card says exactly what the dealership has
 * confirmed for this car and nothing more: an unset value reads "Ask us",
 * never an assumed pass.
 */
export function VehicleHistory({ vehicle }: { vehicle: PublicVehicle }) {
  return (
    <>
      <dl className="mt-5 grid gap-px bg-[var(--border)] sm:grid-cols-2">
        <AssuranceCard icon={<BadgeCheck className="size-4" />} term="History check" {...historyCheckCopy(vehicle.hpiStatus)} />
        <AssuranceCard icon={<ShieldCheck className="size-4" />} term="Warranty" {...warrantyCopy(vehicle)} />
        <AssuranceCard
          icon={<Wrench className="size-4" />}
          term="Service history"
          value={vehicle.serviceHistory ?? "Ask us"}
          detail={
            vehicle.serviceHistory
              ? "Ask to see the history file when you view the car."
              : "Ask us about this car's service history."
          }
        />
        <AssuranceCard
          icon={<Car className="size-4" />}
          term="MOT"
          value={vehicle.motExpiry ? `Expires ${formatDate(vehicle.motExpiry)}` : "Ask us"}
          detail={
            vehicle.motHistory.length
              ? `${vehicle.motHistory.length} test${vehicle.motHistory.length === 1 ? "" : "s"} recorded below.`
              : "Ask us about this car's MOT history."
          }
        />
        {vehicle.documentation ? (
          <AssuranceCard
            icon={<FileText className="size-4" />}
            term="V5C and documents"
            value={vehicle.documentation}
            detail="Documents can be checked at the showroom before you commit."
            className="sm:col-span-2"
          />
        ) : null}
      </dl>

      {vehicle.motHistory.length ? <MotHistory records={vehicle.motHistory} /> : null}

      <p className="mt-5 text-xs leading-relaxed text-[var(--muted-foreground)]">
        <strong className="font-medium text-[var(--foreground)]">ULEZ:</strong> a vehicle&rsquo;s ULEZ
        position depends on its Euro emissions rating rather than its age alone. We&rsquo;ll confirm this
        car&rsquo;s status in writing before you buy — ask us and we&rsquo;ll check the registration for you.
      </p>
    </>
  );
}

function MotHistory({ records }: { records: PublicVehicle["motHistory"] }) {
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <details className="group mt-5 border border-[var(--border)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm [&::-webkit-details-marker]:hidden">
        <span className="font-medium">MOT history</span>
        <span className="text-xs text-[var(--muted-foreground)] group-open:hidden">Show {sorted.length}</span>
        <span className="hidden text-xs text-[var(--muted-foreground)] group-open:inline">Hide</span>
      </summary>
      <div className="overflow-x-auto border-t border-[var(--border)]">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <caption className="sr-only">MOT test history, most recent first</caption>
          <thead>
            <tr className="text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              <th scope="col" className="px-5 py-3 font-normal">Date</th>
              <th scope="col" className="px-5 py-3 font-normal">Result</th>
              <th scope="col" className="px-5 py-3 font-normal">Mileage</th>
              <th scope="col" className="px-5 py-3 font-normal">Notes</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((record) => (
              <tr key={`${record.date}-${record.result}`} className="border-t border-[var(--border)] align-top">
                <td className="whitespace-nowrap px-5 py-3" data-numeric>{formatDate(record.date)}</td>
                <td className="px-5 py-3">{record.result === "pass" ? "Pass" : "Fail"}</td>
                <td className="whitespace-nowrap px-5 py-3" data-numeric>
                  {record.mileage !== undefined ? formatMileage(record.mileage) : "—"}
                </td>
                <td className="px-5 py-3 text-[var(--muted-foreground)]">{record.notes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/**
 * History checks are run through the Autotrader portal and are not
 * downloadable, and not every car is checked — so the card never implies a
 * check the dealership has not confirmed for this specific car.
 */
function historyCheckCopy(status: PublicVehicle["hpiStatus"]): { value: string; detail: string } {
  switch (status) {
    case "clear":
      return {
        value: "Clear",
        detail: "History checked. Ask us and we'll go through the result with you.",
      };
    case "not-checked":
      return {
        value: "Not checked",
        detail: "This car has not been history checked. Ask us if you have any questions about its history.",
      };
    default:
      return { value: "Ask us", detail: "Ask us about the history check for this car." };
  }
}

function warrantyCopy(vehicle: PublicVehicle): { value: string; detail: string } {
  const { available, termMonths } = vehicle.warranty;
  if (available === true) {
    return {
      value: termMonths ? `Available, up to ${termMonths} months` : "Available",
      detail: site.warranty.statement,
    };
  }
  if (available === false) {
    return { value: "Not available on this car", detail: site.warranty.statement };
  }
  return { value: "Ask us", detail: site.warranty.statement };
}

function AssuranceCard({
  icon,
  term,
  value,
  detail,
  className,
}: {
  icon: React.ReactNode;
  term: string;
  value: string;
  detail: string;
  className?: string;
}) {
  return (
    <div className={`bg-[var(--background)] p-5 ${className ?? ""}`}>
      <dt className="font-roman text-[0.625rem] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
        <span aria-hidden className="mb-3 block text-[var(--rule)]">
          {icon}
        </span>
        {term}
      </dt>
      <dd className="mt-1.5">
        <span className="block text-sm font-medium">{value}</span>
        <span className="mt-2 block text-xs leading-relaxed text-[var(--muted-foreground)]">{detail}</span>
      </dd>
    </div>
  );
}
