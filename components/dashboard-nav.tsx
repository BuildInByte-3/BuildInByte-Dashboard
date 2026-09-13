import Link from "next/link";
import type { AdminIdentity } from "@/lib/auth/session";
import { LogoutButton } from "@/components/logout-button";

const links = [
  ["Overview", "/"], ["Users", "/users"], ["Orders", "/orders"], ["Finance", "/finance"],
  ["Geography", "/geography"], ["Inquiries", "/inquiries"], ["Support", "/support"],
  ["Audit", "/audit"], ["Administrators", "/settings/admins"],
];

export function DashboardNav({ admin }: { admin: AdminIdentity }) {
  return (
    <aside className="sidebar">
      <div><p className="eyebrow">BuildInByte</p><h1>Admin</h1>{admin.id === "local-preview" ? <span className="preview-badge">Local preview</span> : null}</div>
      <nav>{links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav>
      <div className="admin-chip"><strong>{admin.displayName}</strong><span>{admin.role}</span><LogoutButton /></div>
    </aside>
  );
}
