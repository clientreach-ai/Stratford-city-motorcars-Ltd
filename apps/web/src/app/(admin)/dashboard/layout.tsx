import { DashboardShell } from "@/components/dashboard/shell";
import { countNewLeads } from "@/lib/leads/store";
import { requireStaff } from "@/lib/server/staff";

// Every dashboard view is per-user and must reflect the latest data.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireStaff();
  const newEnquiries = await countNewLeads().catch(() => null);
  return (
    <DashboardShell user={user} newEnquiries={newEnquiries}>
      {children}
    </DashboardShell>
  );
}
