import { ErrorPanel } from "@/components/error-panel";
import { FinanceBreakdown } from "@/components/finance-breakdown";
import { StatCard } from "@/components/stat-card";
import { TrendChart } from "@/components/trend-chart";
import { defaultRange, getOrders, getOverview } from "@/lib/dashboard/data";
import { formatDate, formatInrMinor, percent } from "@/lib/dashboard/format";
import { requireAdmin } from "@/lib/auth/session";
import { isConfigured } from "@/lib/env";
import { CircleDollarSign, ClipboardList, Download, TrendingUp, Users } from "lucide-react";
import Link from "next/link";

export default async function OverviewPage() {
  if (!isConfigured()) return null;
  const admin = await requireAdmin("dashboard:read");
  const range = defaultRange();
  try {
    const [{ overview, series }, orders] = await Promise.all([getOverview(range.from, range.to), getOrders()]);
    const gross = Number(overview.gross_sales_inr_minor || 0);
    const net = Number(overview.net_sales_inr_minor || 0);
    const profit = Number(overview.profit_inr_minor || 0);
    const refunds = Number(overview.refunds_inr_minor || 0);
    const firstName = admin.displayName.split(/\s+/)[0] || "Admin";
    const today = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date());

    return <>
      <header className="page-header overview-header">
        <div><p className="eyebrow">Operations overview</p><h1>Welcome back, {firstName}</h1><p>Here is what is happening across BuildInByte.</p></div>
        <div className="overview-actions"><span className="control-pill">Last 30 days</span><span className="control-pill">{today}</span><Link className="primary-button export-link" href="/api/exports/finance"><Download size={16} />Export CSV</Link></div>
      </header>
      <section className="stat-grid">
        <StatCard label="Net sales" value={formatInrMinor(net)} detail={`${percent(overview.sales_growth_percent)} vs previous period`} icon={CircleDollarSign} />
        <StatCard label="Pending orders" value={String(overview.pending_orders || 0)} detail="Orders requiring attention" icon={ClipboardList} bars={[36,58,44,68,54,74]} />
        <StatCard label="Registered users" value={String(overview.total_users || 0)} detail={`${percent(overview.user_growth_percent)} vs previous period`} icon={Users} bars={[24,34,42,57,68,82]} />
        <StatCard label="Profit" value={formatInrMinor(profit)} detail="After recorded costs and fees" icon={TrendingUp} bars={[30,48,40,62,57,78]} />
      </section>
      <section className="overview-analytics">
        <article className="panel trend-panel"><div className="panel-title"><div><p className="panel-kicker">Sales trend</p><h2>Sales and profit</h2></div><span className="period-tabs"><span>Daily</span><b>Weekly</b><span>Monthly</span></span></div><TrendChart data={series} /></article>
        <article className="panel breakdown-panel"><div className="panel-title"><div><p className="panel-kicker">Revenue breakdown</p><h2>Financial position</h2></div></div><FinanceBreakdown gross={gross} net={net} profit={profit} refunds={refunds} /><div className="operational-counts"><span><b>{String(overview.open_inquiries || 0)}</b>Open inquiries</span><span><b>{String(overview.open_tickets || 0)}</b>Open tickets</span></div></article>
      </section>
      <section className="panel recent-panel">
        <div className="panel-title"><div><p className="panel-kicker">Recent activity</p><h2>Latest orders</h2></div><Link className="text-link" href="/orders">View all orders →</Link></div>
        {orders.length ? <div className="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Fulfilment</th><th>Total</th><th>Date</th></tr></thead><tbody>{orders.slice(0, 5).map((order) => <tr key={String(order.id)}><td><strong>{String(order.order_number || order.id)}</strong></td><td>{String(order.buyer_email || "—")}</td><td><span className="status">{String(order.payment_status || "—")}</span></td><td>{String(order.fulfillment_status || "—").replaceAll("_", " ")}</td><td><strong>{formatInrMinor(order.total_inr_minor as number)}</strong></td><td>{formatDate(order.created_at)}</td></tr>)}</tbody></table></div> : <div className="empty-state">No recent orders.</div>}
      </section>
    </>;
  } catch (error) { return <><header className="page-header"><div><p className="eyebrow">Overview</p><h1>Executive overview</h1></div></header><ErrorPanel error={error} /></>; }
}
