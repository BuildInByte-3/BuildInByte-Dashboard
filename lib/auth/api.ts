import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type Permission } from "@/lib/auth/permissions";
import { noStoreHeaders } from "@/lib/security/request";

export async function requireApiAdmin(permission: Permission) {
  const admin = await getSession();
  if (!admin) return { admin: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStoreHeaders() }) };
  if (!hasPermission(admin.role, permission)) return { admin: null, response: NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStoreHeaders() }) };
  return { admin, response: null };
}
