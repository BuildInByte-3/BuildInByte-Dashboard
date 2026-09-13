import "server-only";
import { z } from "zod";

const schema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  ADMIN_ENCRYPTION_KEY: z.string().min(20),
  ADMIN_SESSION_PEPPER: z.string().min(24),
  ADMIN_RECOVERY_PEPPER: z.string().min(24),
  IP_HASH_SALT: z.string().min(24),
});

export type ServerEnv = z.infer<typeof schema>;

export function getServerEnv(): ServerEnv {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Dashboard server configuration is incomplete: ${missing}`);
  }
  return parsed.data;
}

export function isConfigured() {
  return schema.safeParse(process.env).success;
}
