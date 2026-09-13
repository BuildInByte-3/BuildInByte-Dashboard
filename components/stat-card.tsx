import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  bars = [28, 46, 38, 66, 52, 82],
}: {
  label: string;
  value: string;
  detail?: string;
  icon: LucideIcon;
  bars?: number[];
}) {
  return (
    <article className="stat-card">
      <div className="stat-card-heading"><span>{label}</span><Icon size={17} strokeWidth={1.8} aria-hidden="true" /></div>
      <div className="stat-card-body">
        <strong>{value}</strong>
        <span className="mini-bars" aria-hidden="true">{bars.map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</span>
      </div>
      <small>{detail || "Current reporting period"}</small>
    </article>
  );
}
