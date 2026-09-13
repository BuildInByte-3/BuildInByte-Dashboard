import "server-only";
import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { isPreviewMode } from "@/lib/env";
import type { AdminIdentity } from "@/lib/auth/session";

const previewCookie = "bib_dashboard_preview";
const lifetimeSeconds = 8 * 60 * 60;

function secret() {
  const value = process.env.DASHBOARD_PREVIEW_SESSION_SECRET;
  if (!isPreviewMode() || !value) throw new Error("Local preview mode is unavailable");
  return value;
}

function sign(payload: string) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function createPreviewSession() {
  const userAgent = (await headers()).get("user-agent") || "unknown";
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + lifetimeSeconds, ua: crypto.createHash("sha256").update(userAgent).digest("hex") })).toString("base64url");
  (await cookies()).set(previewCookie, `${payload}.${sign(payload)}`, { httpOnly: true, secure: false, sameSite: "strict", path: "/", maxAge: lifetimeSeconds });
}

export async function getPreviewSession(): Promise<AdminIdentity | null> {
  if (!isPreviewMode()) return null;
  const token = (await cookies()).get(previewCookie)?.value;
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp: number; ua: string };
    const currentUa = crypto.createHash("sha256").update((await headers()).get("user-agent") || "unknown").digest("hex");
    if (value.exp <= Math.floor(Date.now() / 1000) || !safeEqual(value.ua, currentUa)) return null;
    return { id: "local-preview", email: process.env.DASHBOARD_PREVIEW_EMAIL || "preview@local", displayName: "Local Preview", role: "owner" };
  } catch { return null; }
}

export async function revokePreviewSession() {
  (await cookies()).delete(previewCookie);
}
