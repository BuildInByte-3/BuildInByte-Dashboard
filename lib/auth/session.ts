import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashSessionToken, hashUserAgent, randomToken } from "@/lib/security/crypto";
import { hasPermission, type AdminRole, type Permission } from "@/lib/auth/permissions";

const ABSOLUTE_HOURS = 8;
const IDLE_MINUTES = 30;

export const sessionCookieName = process.env.NODE_ENV === "production"
  ? "__Host-bib_admin_session"
  : "bib_admin_session";

export type AdminIdentity = {
  id: string;
  email: string;
  displayName: string;
  role: AdminRole;
};

export async function createSession(admin: AdminIdentity) {
  const token = randomToken();
  const now = new Date();
  const expires = new Date(now.getTime() + ABSOLUTE_HOURS * 60 * 60 * 1000);
  const headerStore = await headers();
  const userAgent = headerStore.get("user-agent") || "unknown";
  const supabase = createAdminClient();
  const { error } = await supabase.from("admin_sessions").insert({
    admin_id: admin.id,
    token_hash: hashSessionToken(token),
    user_agent_hash: hashUserAgent(userAgent),
    expires_at: expires.toISOString(),
    last_seen_at: now.toISOString(),
  });
  if (error) throw new Error(error.message);

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: ABSOLUTE_HOURS * 60 * 60,
  });
}

export async function getSession(): Promise<AdminIdentity | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (!token) return null;

  const headerStore = await headers();
  const userAgentHash = hashUserAgent(headerStore.get("user-agent") || "unknown");
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("admin_sessions")
    .select("id, expires_at, last_seen_at, user_agent_hash, revoked_at, admin_accounts!inner(id,email,display_name,role,is_active)")
    .eq("token_hash", hashSessionToken(token))
    .maybeSingle();

  if (error || !data) return null;
  const row = data as unknown as {
    id: string;
    expires_at: string;
    last_seen_at: string;
    user_agent_hash: string;
    revoked_at: string | null;
    admin_accounts: { id: string; email: string; display_name: string; role: AdminRole; is_active: boolean } | { id: string; email: string; display_name: string; role: AdminRole; is_active: boolean }[];
  };
  const admin = Array.isArray(row.admin_accounts) ? row.admin_accounts[0] : row.admin_accounts;
  const now = Date.now();
  const idleAt = new Date(String(row.last_seen_at)).getTime() + IDLE_MINUTES * 60 * 1000;
  if (row.revoked_at || new Date(String(row.expires_at)).getTime() <= now || idleAt <= now || row.user_agent_hash !== userAgentHash || !admin?.is_active) {
    return null;
  }

  if (now - new Date(String(row.last_seen_at)).getTime() > 5 * 60 * 1000) {
    await supabase.from("admin_sessions").update({ last_seen_at: new Date(now).toISOString() }).eq("id", row.id);
  }

  return {
    id: String(admin.id),
    email: String(admin.email),
    displayName: String(admin.display_name),
    role: admin.role as AdminRole,
  };
}

export async function requireAdmin(permission: Permission = "dashboard:read") {
  const admin = await getSession();
  if (!admin) redirect("/login");
  if (!hasPermission(admin.role, permission)) redirect("/forbidden");
  return admin;
}

export async function revokeCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (token) {
    const supabase = createAdminClient();
    await supabase.from("admin_sessions").update({ revoked_at: new Date().toISOString() }).eq("token_hash", hashSessionToken(token));
  }
  cookieStore.delete(sessionCookieName);
}
