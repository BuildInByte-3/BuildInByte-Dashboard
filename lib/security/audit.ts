import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminIdentity } from "@/lib/auth/session";

export async function audit(admin: AdminIdentity | null, action: string, entityType: string, entityId?: string, metadata: Record<string, unknown> = {}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("admin_audit_log").insert({
    admin_id: admin?.id ?? null,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    metadata,
  });
  if (error) console.error("Audit log write failed", { action, entityType, message: error.message });
}
