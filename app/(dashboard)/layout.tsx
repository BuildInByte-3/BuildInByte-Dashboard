import { ConfigurationRequired } from "@/components/configuration-required";
import { DashboardNav } from "@/components/dashboard-nav";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { requireAdmin } from "@/lib/auth/session";
import { isConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!isConfigured()) return <ConfigurationRequired />;
  const admin = await requireAdmin();
  return (
    <div className="app-shell">
      <DashboardNav admin={admin} />
      <div className="workspace">
        <DashboardTopbar admin={admin} />
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
