import { NextRequest, NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/auth/api";
import { orderUpdateSchema } from "@/lib/validation";
import { assertSameOrigin, noStoreHeaders } from "@/lib/security/request";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/security/audit";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAdmin("orders:write"); if (auth.response) return auth.response;
  try { assertSameOrigin(request); } catch { return NextResponse.json({ error: "Invalid request origin" }, { status: 403 }); }
  const parsed = orderUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid order update", details: parsed.error.flatten() }, { status: 422 });
  const { id } = await params; const { expectedUpdatedAt, paymentStatus, fulfillmentStatus } = parsed.data;
  const changes = { ...(paymentStatus ? { payment_status: paymentStatus } : {}), ...(fulfillmentStatus ? { fulfillment_status: fulfillmentStatus } : {}), updated_at: new Date().toISOString() };
  const client = createAdminClient();
  const { data, error } = await client.from("orders").update(changes).eq("id", id).eq("updated_at", expectedUpdatedAt).select("*").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400, headers: noStoreHeaders() });
  if (!data) return NextResponse.json({ error: "Order changed since it was loaded" }, { status: 409, headers: noStoreHeaders() });
  await audit(auth.admin, "order.update", "order", id, changes);
  return NextResponse.json({ data }, { headers: noStoreHeaders() });
}
