import { redirect } from "next/navigation";
import { ConfigurationRequired } from "@/components/configuration-required";
import { LoginForm } from "@/components/login-form";
import { isConfigured } from "@/lib/env";
import { getSession } from "@/lib/auth/session";

export default async function LoginPage() {
  if (!isConfigured()) return <ConfigurationRequired />;
  if (await getSession()) redirect("/");
  return <main className="login-shell"><section className="login-card"><p className="eyebrow">Private workspace</p><h1>BuildInByte Admin</h1><p>Use your dedicated administrator credentials and authenticator.</p><LoginForm /></section></main>;
}
