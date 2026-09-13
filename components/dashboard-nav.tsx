"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ClipboardList,
  FileSearch,
  Globe2,
  Headphones,
  Landmark,
  LayoutDashboard,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { AdminIdentity } from "@/lib/auth/session";
import { LogoutButton } from "@/components/logout-button";

const groups = [
  {
    label: "Workspace",
    links: [
      { label: "Overview", href: "/", icon: LayoutDashboard },
      { label: "Users", href: "/users", icon: Users },
      { label: "Orders", href: "/orders", icon: ClipboardList },
      { label: "Finance", href: "/finance", icon: Landmark },
    ],
  },
  {
    label: "Customer operations",
    links: [
      { label: "Geography", href: "/geography", icon: Globe2 },
      { label: "Inquiries", href: "/inquiries", icon: FileSearch },
      { label: "Support", href: "/support", icon: Headphones },
    ],
  },
  {
    label: "Management",
    links: [
      { label: "Audit log", href: "/audit", icon: BarChart3 },
      { label: "Administrators", href: "/settings/admins", icon: ShieldCheck },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname.startsWith(href);
}

export function DashboardNav({ admin }: { admin: AdminIdentity }) {
  const pathname = usePathname();
  const initials = admin.displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  return (
    <aside className="sidebar">
      <Link className="workspace-switcher" href="/" aria-label="BuildInByte dashboard home">
        <span className="brand-mark" aria-hidden="true">B</span>
        <span><small>Workspace</small><strong>BuildInByte</strong></span>
        <span className="switcher-chevrons" aria-hidden="true">⌃<br />⌄</span>
      </Link>

      <nav aria-label="Dashboard navigation">
        {groups.map((group) => (
          <div className="nav-group" key={group.label}>
            <p>{group.label}</p>
            {group.links.map(({ label, href, icon: Icon }) => (
              <Link className={isActive(pathname, href) ? "active" : undefined} key={href} href={href}>
                <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-account">
        <span className="account-avatar" aria-hidden="true">{initials}</span>
        <span className="account-copy">
          <strong>{admin.displayName}</strong>
          <small>{admin.role}{admin.id === "local-preview" ? " · preview" : ""}</small>
        </span>
        <LogoutButton />
      </div>
    </aside>
  );
}
