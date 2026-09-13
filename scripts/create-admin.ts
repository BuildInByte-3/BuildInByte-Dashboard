import { createClient } from "@supabase/supabase-js";
import { hash } from "@node-rs/argon2";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import crypto from "node:crypto";
import readline from "node:readline/promises";
import process from "node:process";

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function encrypt(value: string) {
  const key = Buffer.from(env("ADMIN_ENCRYPTION_KEY"), "base64");
  if (key.length !== 32) throw new Error("ADMIN_ENCRYPTION_KEY must decode to 32 bytes");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((item) => item.toString("base64url")).join(".");
}

function recoveryHash(value: string) {
  return crypto.createHmac("sha256", env("ADMIN_RECOVERY_PEPPER")).update(value).digest("hex");
}

const input = readline.createInterface({ input: process.stdin, output: process.stdout });
try {
  const email = (await input.question("Admin email: ")).trim().toLowerCase();
  const displayName = (await input.question("Display name: ")).trim();
  const password = await input.question("Temporary password (12+ characters): ");
  if (password.length < 12) throw new Error("Password must contain at least 12 characters");
  const secret = authenticator.generateSecret();
  const passwordHash = await hash(password, { algorithm: 2, memoryCost: 19456, timeCost: 3, parallelism: 1, outputLen: 32 });
  const client = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
  const { data, error } = await client.from("admin_accounts").insert({
    email, display_name: displayName, password_hash: passwordHash, role: "owner",
    mfa_secret_encrypted: encrypt(secret), mfa_enabled: true,
  }).select("id").single();
  if (error) throw error;
  const codes = Array.from({ length: 10 }, () => crypto.randomBytes(6).toString("hex").toUpperCase());
  const { error: codeError } = await client.from("admin_recovery_codes").insert(codes.map((code) => ({ admin_id: data.id, code_hash: recoveryHash(code) })));
  if (codeError) throw codeError;
  const uri = authenticator.keyuri(email, "BuildInByte Admin", secret);
  console.log(await QRCode.toString(uri, { type: "terminal", small: true }));
  console.log(`Recovery codes (store once, offline):\n${codes.join("\n")}`);
} finally {
  input.close();
}
