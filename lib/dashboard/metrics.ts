export type PeriodTotals = { users: number; netSalesInrMinor: number };

export function growthPercent(current: number, previous: number) {
  if (previous === 0) return null;
  return Math.round((((current - previous) / previous) * 100) * 10) / 10;
}

export function financialTotals(input: {
  grossInrMinor: number;
  discountsInrMinor: number;
  refundsInrMinor: number;
  costsInrMinor: number;
}) {
  const netSalesInrMinor = input.grossInrMinor - input.discountsInrMinor - input.refundsInrMinor;
  return { netSalesInrMinor, profitInrMinor: netSalesInrMinor - input.costsInrMinor };
}

export function isPendingOrder(status: string) {
  return ["new", "confirmed", "in_progress", "ready"].includes(status);
}
