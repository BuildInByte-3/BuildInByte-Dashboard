import { NextRequest, NextResponse } from "next/server";
import { getSession, revokeCurrentSession } from "@/lib/auth/session";
import { assertSameOrigin, noStoreHeaders } from "@/lib/security/request";
import { audit } from "@/lib/security/audit";

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return NextResponse.json({ error: "Invalid request origin" }, { status: 403, headers: noStoreHeaders() }); }
  const admin = await getSession();
  await revokeCurrentSession();
  if (admin) await audit(admin, "admin.logout", "admin_account", admin.id);
  return NextResponse.json({ loggedOut: true }, { headers: { ...noStoreHeaders(), "Clear-Site-Data": "\"cache\", \"cookies\", \"storage\"" } });
}
