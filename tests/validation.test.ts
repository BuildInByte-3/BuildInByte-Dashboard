import { describe, expect, it } from "vitest";
import { loginSchema, orderUpdateSchema } from "@/lib/validation";

describe("request validation", () => {
  it("normalizes an administrator email", () => {
    const parsed = loginSchema.parse({ email: " ADMIN@Example.com ", password: "correct horse battery staple" });
    expect(parsed.email).toBe("admin@example.com");
  });
  it("rejects short passwords", () => expect(loginSchema.safeParse({ email: "admin@example.com", password: "short" }).success).toBe(false));
  it("requires optimistic concurrency for order mutations", () => {
    expect(orderUpdateSchema.safeParse({ paymentStatus: "paid" }).success).toBe(false);
    expect(orderUpdateSchema.safeParse({ paymentStatus: "paid", expectedUpdatedAt: new Date().toISOString() }).success).toBe(true);
  });
});
