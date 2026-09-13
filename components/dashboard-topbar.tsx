"use client";

import Link from "next/link";
import { Bell, Headphones, Search } from "lucide-react";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AdminIdentity } from "@/lib/auth/session";

const labels: Record<string, string> = {
  "/": "Overview",
  "/users": "Users",
  "/orders": "Orders",
  "/finance": "Finance",
  "/geography": "Geography",
  "/inquiries": "Inquiries",
  "/support": "Support",
  "/audit": "Audit log",
  "/settings/admins": "Administrators",
};

export function DashboardTopbar({ admin }: { admin: AdminIdentity }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const page = labels[pathname] || "Dashboard";
  const initials = admin.displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  const openSearchResult = (value: string) => {
    const query = value.trim().toLowerCase();
    if (!query) return;
    const match = Object.entries(labels).find(([, label]) => label.toLowerCase().includes(query));
    if (match) router.push(match[0]);
  };

  return (
    <header className="topbar">
      <p className="breadcrumb"><span>Dashboard</span><b aria-hidden="true">/</b><strong>{page}</strong></p>
      <div className="topbar-actions">
        <label className="global-search">
          <Search size={17} aria-hidden="true" />
          <input ref={searchRef} aria-label="Search dashboard" placeholder="Search dashboard" type="search" onKeyDown={(event) => { if (event.key === "Enter") openSearchResult(event.currentTarget.value); }} />
          <kbd>⌘ K</kbd>
        </label>
        <Link className="icon-link" href="/inquiries" aria-label="Open inquiries"><Bell size={18} /></Link>
        <Link className="icon-link" href="/support" aria-label="Open support"><Headphones size={18} /></Link>
        <Link className="topbar-avatar" href="/settings/admins" aria-label="Open administrator settings">{initials}</Link>
      </div>
    </header>
  );
}
