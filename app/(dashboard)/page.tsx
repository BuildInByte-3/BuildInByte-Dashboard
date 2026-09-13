import { ErrorPanel } from "@/components/error-panel";
import { StatCard } from "@/components/stat-card";
import { TrendChart } from "@/components/trend-chart";
import { defaultRange, getOverview } from "@/lib/dashboard/data";
import { formatInrMinor, percent } from "@/lib/dashboard/format";
import { requireAdmin } from "@/lib/auth/session";
import { isConfigured } from "@/lib/env";

export default async function OverviewPage() {
  if (!isConfigured()) return null;
  await requireAdmin("dashboard:read");
  const range = defaultRange();
  try {
    const { overview, series } = await getOverview(range.from, range.to);
    return <><header className="page-header"><div><p className="eyebrow">Last 30 days</p><h1>Executive overview</h1><p>Business activity reported in INR and Asia/Kolkata.</p></div></header>
      <section className="stat-grid">
        <StatCard label="Registered users" value={String(overview.total_users || 0)} detail={`${percent(overview.user_growth_percent)} growth`} />
        <StatCard label="Net sales" value={formatInrMinor(overview.net_sales_inr_minor as number)} detail={`${percent(overview.sales_growth_percent)} growth`} />
        <StatCard label="Profit" value={formatInrMinor(overview.profit_inr_minor as number)} />
        <StatCard label="Pending orders" value={String(overview.pending_orders || 0)} />
      </section>
      <section className="stat-grid"><StatCard label="Gross sales" value={formatInrMinor(overview.gross_sales_inr_minor as number)} /><StatCard label="Refunds" value={formatInrMinor(overview.refunds_inr_minor as number)} /><StatCard label="Open inquiries" value={String(overview.open_inquiries || 0)} /><StatCard label="Open tickets" value={String(overview.open_tickets || 0)} /></section>
      <section className="panel"><div className="panel-title"><h2>Sales and profit</h2></div><TrendChart data={series} /></section></>;
  } catch (error) { return <><header className="page-header"><div><p className="eyebrow">Overview</p><h1>Executive overview</h1></div></header><ErrorPanel error={error} /></>; }
}
