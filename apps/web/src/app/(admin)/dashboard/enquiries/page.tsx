import type { Metadata, Route } from "next";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";

import { Notice, PageTitle, Tag } from "@/components/dashboard/ui";
import { updateLeadStatus } from "@/lib/dashboard/actions";
import { formatDate } from "@/lib/format";
import { leadStorageAvailable, listRecentLeads, type StoredLead } from "@/lib/leads/store";
import { requireStaff } from "@/lib/server/staff";

export const metadata: Metadata = { title: "Enquiries" };

const KIND_LABEL: Record<StoredLead["kind"], string> = {
  "vehicle-enquiry": "Car enquiry",
  finance: "Finance",
  "part-exchange": "Part exchange",
  contact: "General enquiry",
};

/** Human labels for stored form fields, in a sensible reading order. */
const FIELD_LABEL: Record<string, string> = {
  requestType: "Request",
  vehicleTitle: "Car",
  preferredDate: "Preferred date",
  preferredTime: "Preferred time",
  enquiryType: "About",
  vehicle: "Car",
  deposit: "Deposit (£)",
  monthlyBudget: "Monthly budget (£)",
  registration: "Registration",
  make: "Make",
  model: "Model",
  year: "Year",
  mileage: "Mileage",
  serviceHistory: "Service history",
  motStatus: "MOT",
  keys: "Keys",
  condition: "Condition",
  conditionNotes: "Condition notes",
  outstandingFinance: "Outstanding finance",
  interestedIn: "Interested in",
  interestedInFinance: "Wants finance",
  hasPartExchange: "Has a part exchange",
  message: "Message",
};

const REQUEST_LABEL: Record<string, string> = { question: "Question", viewing: "Viewing request", "test-drive": "Test drive request" };

export default async function EnquiriesPage() {
  await requireStaff();
  const available = leadStorageAvailable();
  const leads = available ? await listRecentLeads(100) : [];

  return (
    <>
      <PageTitle
        title="Enquiries"
        description="Every enquiry sent through the website, newest first. Viewing and test drive requests still need confirming with the customer by phone or WhatsApp."
      />

      {!available ? <Notice tone="error">Enquiry storage isn&rsquo;t connected on this server, so enquiries can&rsquo;t be shown here.</Notice> : null}

      {available && !leads.length ? (
        <div className="border border-dashed border-[var(--border-strong)] bg-[var(--background)] px-6 py-16 text-center">
          <p className="font-display text-xl">No enquiries yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted-foreground)]">They&rsquo;ll appear here as soon as someone sends one from the website.</p>
        </div>
      ) : null}

      <ul className="space-y-4">
        {leads.map((lead) => (
          <li key={lead.id} className="border border-[var(--border)] bg-[var(--background)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-3.5">
              <div className="min-w-0">
                <p className="font-medium">
                  {lead.name}
                  <span className="ml-2 text-sm font-normal text-[var(--muted-foreground)]">{KIND_LABEL[lead.kind]}</span>
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {formatDate(lead.createdAt)} · Ref {lead.reference}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {lead.status === "new" ? <Tag tone="brass">New</Tag> : <Tag>{lead.status === "contacted" ? "Contacted" : "Closed"}</Tag>}
                <form action={updateLeadStatus} className="flex gap-1">
                  <input type="hidden" name="id" value={lead.id} />
                  <label htmlFor={`status-${lead.id}`} className="sr-only">
                    Status for {lead.name}
                  </label>
                  <select id={`status-${lead.id}`} name="status" defaultValue={lead.status} className="h-11 border border-[var(--input)] bg-[var(--surface-raised)] px-2 text-sm">
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="closed">Closed</option>
                  </select>
                  <button type="submit" className="h-11 border border-[var(--border-strong)] px-3 text-xs font-medium uppercase tracking-[0.12em] hover:border-[var(--primary)]">
                    Update
                  </button>
                </form>
              </div>
            </div>

            <div className="grid gap-5 p-5 md:grid-cols-[14rem_1fr]">
              <div className="space-y-2 text-sm">
                {lead.phone ? (
                  <a href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`} className="flex min-h-11 items-center gap-2 underline-offset-2 hover:underline">
                    <Phone aria-hidden className="size-4" /> {lead.phone}
                  </a>
                ) : null}
                {lead.email ? (
                  <a href={`mailto:${lead.email}`} className="flex min-h-11 items-center gap-2 break-all underline-offset-2 hover:underline">
                    <Mail aria-hidden className="size-4 shrink-0" /> {lead.email}
                  </a>
                ) : null}
                {lead.vehicleSlug ? (
                  <Link href={`/vehicles/${lead.vehicleSlug}` as Route} target="_blank" className="block text-xs underline underline-offset-2">
                    View the car on the website
                  </Link>
                ) : null}
              </div>
              <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                {Object.entries(FIELD_LABEL)
                  .filter(([key]) => lead.payload[key] !== undefined && lead.payload[key] !== "" && lead.payload[key] !== false)
                  .map(([key, label]) => {
                    const raw = lead.payload[key];
                    const value =
                      raw === true ? "Yes" : key === "requestType" ? (REQUEST_LABEL[String(raw)] ?? String(raw)) : key === "preferredDate" ? formatDate(String(raw)) : String(raw);
                    return (
                      <div key={key} className={key === "message" || key === "conditionNotes" ? "sm:col-span-2" : undefined}>
                        <dt className="text-xs text-[var(--muted-foreground)]">{label}</dt>
                        <dd className="whitespace-pre-line">{value}</dd>
                      </div>
                    );
                  })}
              </dl>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
