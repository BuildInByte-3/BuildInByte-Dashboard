import { NextRequest, NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/auth/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/security/audit";
import { isPreviewMode } from "@/lib/env";

function csv(value: unknown) {
  let normalized = String(value ?? "");
  // Prevent spreadsheet-formula execution when an exported value is opened.
  if (/^[=+\-@]/.test(normalized)) normalized = `'${normalized}`;
  return `"${normalized.replaceAll('"', '""')}"`;
}

export async function GET(request: NextRequest) {
  const auth = await requireApiAdmin("finance:read");
  if (auth.response) return auth.response;
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  if (!from?.match(/^\d{4}-\d{2}-\d{2}$/) || !to?.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return NextResponse.json({ error: "Valid from and to dates are required" }, { status: 422 });
  }
  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toExclusive = new Date(`${to}T00:00:00.000Z`);
  if (!(fromDate < toExclusive) || toExclusive.getTime() - fromDate.getTime() > 366 * 86_400_000) {
    return NextResponse.json({ error: "Date range must be between 1 and 366 days" }, { status: 422 });
  }

  if (isPreviewMode()) {
    const body = "id,order_id,provider,method,status,currency,amount_minor,amount_inr_minor,created_at\n\"preview-payment\",\"preview-order\",\"manual\",\"bank_transfer\",\"captured\",\"INR\",\"2500000\",\"2500000\",\"preview\"";
    return new NextResponse(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="finance-preview-${from}-${to}.csv"`, "Cache-Control": "no-store" } });
  }

  const client = createAdminClient();
  const { data, error } = await client.from("payments")
    .select("id,order_id,provider,method,status,currency,amount_minor,amount_inr_minor,created_at")
    .gte("created_at", fromDate.toISOString()).lt("created_at", toExclusive.toISOString())
    .order("created_at", { ascending: false }).limit(10000);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const headers = ["id", "order_id", "provider", "method", "status", "currency", "amount_minor", "amount_inr_minor", "created_at"];
  const rows = (data || []) as Record<string, unknown>[];
  const body = [headers.join(","), ...rows.map((row) => headers.map((key) => csv(row[key])).join(","))].join("\n");
  await audit(auth.admin, "finance.export", "payment", undefined, { from, to, rows: rows.length });
  return new NextResponse(body, { headers: {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="finance-${from}-${to}.csv"`,
    "Cache-Control": "no-store",
  } });
}
