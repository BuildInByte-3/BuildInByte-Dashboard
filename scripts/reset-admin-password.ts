import { createClient } from "@supabase/supabase-js";
import { hash } from "@node-rs/argon2";
import readline from "node:readline/promises";
import process from "node:process";

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const input = readline.createInterface({ input: process.stdin, output: process.stdout });
try {
  const email = (await input.question("Admin email: ")).trim().toLowerCase();
  const password = await input.question("New password (12+ characters): ");
  if (password.length < 12) throw new Error("Password must contain at least 12 characters");
  const passwordHash = await hash(password, { algorithm: 2, memoryCost: 19456, timeCost: 3, parallelism: 1, outputLen: 32 });
  const client = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
  const { data, error } = await client.from("admin_accounts").update({
    password_hash: passwordHash, password_changed_at: new Date().toISOString(), locked_until: null,
  }).eq("email", email).select("id").single();
  if (error) throw error;
  await client.from("admin_sessions").update({ revoked_at: new Date().toISOString() }).eq("admin_id", data.id).is("revoked_at", null);
  console.log("Password updated and all sessions revoked.");
} finally {
  input.close();
}
