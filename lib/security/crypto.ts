import "server-only";
import crypto from "node:crypto";
import { getServerEnv } from "@/lib/env";

function encryptionKey() {
  const raw = Buffer.from(getServerEnv().ADMIN_ENCRYPTION_KEY, "base64");
  if (raw.length !== 32) throw new Error("ADMIN_ENCRYPTION_KEY must decode to exactly 32 bytes");
  return raw;
}

export function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptSecret(value: string) {
  const [ivRaw, tagRaw, encryptedRaw] = value.split(".");
  if (!ivRaw || !tagRaw || !encryptedRaw) throw new Error("Invalid encrypted secret");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function hashWithPepper(value: string, pepper: string) {
  return crypto.createHmac("sha256", pepper).update(value).digest("hex");
}

export function hashSessionToken(token: string) {
  return hashWithPepper(token, getServerEnv().ADMIN_SESSION_PEPPER);
}

export function hashRecoveryCode(code: string) {
  return hashWithPepper(code.trim().toUpperCase(), getServerEnv().ADMIN_RECOVERY_PEPPER);
}

export function hashIp(ip: string) {
  return hashWithPepper(ip, getServerEnv().IP_HASH_SALT);
}

export function hashIdentity(identity: string) {
  return hashWithPepper(identity.trim().toLowerCase(), getServerEnv().IP_HASH_SALT);
}

export function hashUserAgent(userAgent: string) {
  return crypto.createHash("sha256").update(userAgent).digest("hex");
}
