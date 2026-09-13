type Segment = { label: string; value: number; tone: string };

export function FinanceBreakdown({ gross, net, profit, refunds }: { gross: number; net: number; profit: number; refunds: number }) {
  const maximum = Math.max(gross, 1);
  const segments: Segment[] = [
    { label: "Gross sales", value: gross, tone: "#171715" },
    { label: "Net sales", value: net, tone: "#55534e" },
    { label: "Profit", value: profit, tone: "#94918a" },
    { label: "Refunds", value: refunds, tone: "#d1cec7" },
  ];
  const format = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 1 }).format(value / 100);

  return (
    <div className="finance-breakdown">
      <div className="breakdown-total"><small>Net sales</small><strong>{format(net)}</strong></div>
      <div className="breakdown-bars" aria-label="Financial breakdown">
        {segments.map((segment) => (
          <div className="breakdown-row" key={segment.label}>
            <div><span>{segment.label}</span><strong>{format(segment.value)}</strong></div>
            <span className="breakdown-track"><i style={{ background: segment.tone, width: `${Math.max(3, (segment.value / maximum) * 100)}%` }} /></span>
          </div>
        ))}
      </div>
    </div>
  );
}
