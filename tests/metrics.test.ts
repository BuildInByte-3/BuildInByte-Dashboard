import { describe, expect, it } from "vitest";
import { financialTotals, growthPercent, isPendingOrder } from "@/lib/dashboard/metrics";

describe("dashboard metric contracts", () => {
  it("reports new activity without dividing by zero", () => expect(growthPercent(12, 0)).toBeNull());
  it("computes positive and negative period growth", () => {
    expect(growthPercent(150, 100)).toBe(50);
    expect(growthPercent(75, 100)).toBe(-25);
  });
  it("subtracts discounts, refunds, and costs from gross sales", () => {
    expect(financialTotals({ grossInrMinor: 100000, discountsInrMinor: 5000, refundsInrMinor: 10000, costsInrMinor: 15000 }))
      .toEqual({ netSalesInrMinor: 85000, profitInrMinor: 70000 });
  });
  it("uses the agreed pending fulfilment states", () => {
    expect(isPendingOrder("ready")).toBe(true);
    expect(isPendingOrder("delivered")).toBe(false);
    expect(isPendingOrder("cancelled")).toBe(false);
  });
});
