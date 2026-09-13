import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPassword } from "@/lib/auth/password";
import { verifyMfa } from "@/lib/auth/mfa";
import { createSession, type AdminIdentity } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation";
import { hashIdentity, hashIp, hashRecoveryCode } from "@/lib/security/crypto";
import { assertSameOrigin, noStoreHeaders, requestIp } from "@/lib/security/request";
import { audit } from "@/lib/security/audit";
import type { AdminRole } from "@/lib/auth/permissions";

function response(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: noStoreHeaders() });
}

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return response({ error: "Invalid request origin" }, 403); }
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return response({ error: "Invalid credentials" }, 422);

  const { email, password, totp } = parsed.data;
  const ipHash = hashIp(requestIp(request));
  const identityHash = hashIdentity(email);
  const client = createAdminClient();
  const { data: allowed, error: limitError } = await client.rpc("check_admin_login_limit", { p_ip_hash: ipHash, p_identity_hash: identityHash });
  if (limitError) return response({ error: "Authentication service unavailable" }, 503);
  if (!allowed) return response({ error: "Too many attempts. Try again later." }, 429);

  const { data, error } = await client.from("admin_accounts").select("id,email,display_name,role,password_hash,mfa_secret_encrypted,mfa_enabled,is_active,locked_until").eq("email", email).maybeSingle();
  const account = data as Record<string, unknown> | null;
  const passwordValid = account?.password_hash ? await verifyPassword(String(account.password_hash), password) : false;
  const locked = account?.locked_until && new Date(String(account.locked_until)).getTime() > Date.now();

  if (error || !account || !account.is_active || locked || !passwordValid) {
    await client.from("admin_login_attempts").insert({ ip_hash: ipHash, identity_hash: identityHash, succeeded: false });
    return response({ error: "Invalid credentials" }, 401);
  }

  if (!totp) return response({ error: "MFA is required", mfaRequired: true }, 428);
  let mfaValid = false;
  try { mfaValid = Boolean(account.mfa_secret_encrypted) && verifyMfa(String(account.mfa_secret_encrypted), totp); } catch { mfaValid = false; }

  if (!mfaValid) {
    const codeHash = hashRecoveryCode(totp);
    const { data: recovery } = await client.from("admin_recovery_codes").select("id").eq("admin_id", String(account.id)).eq("code_hash", codeHash).is("used_at", null).maybeSingle();
    if (recovery) {
      const { data: consumed } = await client.from("admin_recovery_codes").update({ used_at: new Date().toISOString() }).eq("id", String((recovery as Record<string, unknown>).id)).is("used_at", null).select("id").maybeSingle();
      mfaValid = Boolean(consumed);
    }
  }

  if (!mfaValid) {
    await client.from("admin_login_attempts").insert({ admin_id: account.id, ip_hash: ipHash, identity_hash: identityHash, succeeded: false });
    return response({ error: "Invalid authenticator or recovery code", mfaRequired: true }, 401);
  }

  const admin: AdminIdentity = { id: String(account.id), email: String(account.email), displayName: String(account.display_name), role: account.role as AdminRole };
  await createSession(admin);
  await Promise.all([
    client.from("admin_accounts").update({ last_login_at: new Date().toISOString(), locked_until: null }).eq("id", String(account.id)),
    client.from("admin_login_attempts").insert({ admin_id: account.id, ip_hash: ipHash, identity_hash: identityHash, succeeded: true }),
    audit(admin, "admin.login", "admin_account", String(account.id)),
  ]);
  return response({ authenticated: true }, 200);
}
