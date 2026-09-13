import { NextResponse } from "next/server";
import { isConfigured, isPreviewMode } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { noStoreHeaders } from "@/lib/security/request";

export async function GET() {
  if (!isConfigured()) return NextResponse.json({ status: "configuration_required" }, { status: 503, headers: noStoreHeaders() });
  if (isPreviewMode()) return NextResponse.json({ status: "preview", database: "not_connected" }, { headers: noStoreHeaders() });
  const started = Date.now();
  const { error } = await createAdminClient().from("admin_accounts").select("id", { head: true, count: "exact" }).limit(1);
  return NextResponse.json({ status: error ? "degraded" : "ok", database: error ? "unavailable" : "ok", latencyMs: Date.now() - started }, { status: error ? 503 : 200, headers: noStoreHeaders() });
}
