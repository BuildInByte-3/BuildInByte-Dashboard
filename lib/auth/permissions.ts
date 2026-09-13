export const ROLES = ["owner", "administrator", "finance", "support", "analyst"] as const;
export type AdminRole = (typeof ROLES)[number];

export type Permission =
  | "dashboard:read"
  | "users:read"
  | "orders:read"
  | "orders:write"
  | "finance:read"
  | "inquiries:read"
  | "inquiries:write"
  | "support:read"
  | "support:write"
  | "audit:read"
  | "admins:manage";

const permissions: Record<AdminRole, Permission[]> = {
  owner: ["dashboard:read", "users:read", "orders:read", "orders:write", "finance:read", "inquiries:read", "inquiries:write", "support:read", "support:write", "audit:read", "admins:manage"],
  administrator: ["dashboard:read", "users:read", "orders:read", "orders:write", "finance:read", "inquiries:read", "inquiries:write", "support:read", "support:write", "audit:read"],
  finance: ["dashboard:read", "users:read", "orders:read", "orders:write", "finance:read", "audit:read"],
  support: ["dashboard:read", "users:read", "orders:read", "inquiries:read", "inquiries:write", "support:read", "support:write"],
  analyst: ["dashboard:read", "users:read", "orders:read", "finance:read", "inquiries:read", "support:read"],
};

export function hasPermission(role: AdminRole, permission: Permission) {
  return permissions[role]?.includes(permission) ?? false;
}
