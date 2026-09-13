import { describe, expect, it } from "vitest";
import { hasPermission } from "@/lib/auth/permissions";

describe("role permissions", () => {
  it("allows only owners to manage administrators", () => {
    expect(hasPermission("owner", "admins:manage")).toBe(true);
    expect(hasPermission("administrator", "admins:manage")).toBe(false);
    expect(hasPermission("analyst", "admins:manage")).toBe(false);
  });
  it("keeps support staff away from finance", () => expect(hasPermission("support", "finance:read")).toBe(false));
  it("keeps analysts read-only", () => {
    expect(hasPermission("analyst", "dashboard:read")).toBe(true);
    expect(hasPermission("analyst", "orders:write")).toBe(false);
  });
});
