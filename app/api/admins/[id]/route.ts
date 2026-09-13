import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAdmin } from "@/lib/auth/api";
import { assertSameOrigin, noStoreHeaders } from "@/lib/security/request";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/security/audit";

const schema = z.object({
  role: z.enum(["owner", "administrator", "finance", "support", "analyst"]).optional(),
  isActive: z.boolean().optional(),
}).strict().refine((value) => value.role !== undefined || value.isActive !== undefined);

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAdmin("admins:manage");
  if (auth.response) return auth.response;
  try { assertSameOrigin(request); } catch { return NextResponse.json({ error: "Invalid request origin" }, { status: 403 }); }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid administrator update" }, { status: 422 });
  const { id } = await params;
  if (id === auth.admin.id && (parsed.data.isActive === false || (parsed.data.role && parsed.data.role !== "owner"))) {
    return NextResponse.json({ error: "You cannot remove your own owner access" }, { status: 409 });
  }

  const client = createAdminClient();
  const { data: target, error: targetError } = await client.from("admin_accounts").select("id,role,is_active").eq("id", id).maybeSingle();
  if (targetError || !target) return NextResponse.json({ error: "Administrator not found" }, { status: 404 });
  const removesOwner = target.role === "owner" && target.is_active && (parsed.data.isActive === false || (parsed.data.role && parsed.data.role !== "owner"));
  if (removesOwner) {
    const { count, error: countError } = await client.from("admin_accounts").select("id", { count: "exact", head: true }).eq("role", "owner").eq("is_active", true);
    if (countError) return NextResponse.json({ error: "Unable to verify owner coverage" }, { status: 503 });
    if ((count || 0) <= 1) return NextResponse.json({ error: "At least one active owner is required" }, { status: 409 });
  }

  const changes = {
    ...(parsed.data.role ? { role: parsed.data.role } : {}),
    ...(parsed.data.isActive !== undefined ? { is_active: parsed.data.isActive } : {}),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await client.from("admin_accounts").update(changes).eq("id", id).select("id,email,display_name,role,is_active").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (parsed.data.isActive === false || (parsed.data.role && parsed.data.role !== target.role)) {
    await client.from("admin_sessions").update({ revoked_at: new Date().toISOString() }).eq("admin_id", id).is("revoked_at", null);
  }
  await audit(auth.admin, "admin.update", "admin_account", id, changes);
  return NextResponse.json({ data }, { headers: noStoreHeaders() });
}
