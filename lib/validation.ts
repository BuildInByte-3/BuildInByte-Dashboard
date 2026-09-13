import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(12).max(256),
  totp: z.string().trim().min(6).max(32).optional(),
}).strict();

export const orderUpdateSchema = z.object({
  paymentStatus: z.enum(["pending", "authorized", "paid", "partially_refunded", "refunded", "failed", "cancelled"]).optional(),
  fulfillmentStatus: z.enum(["new", "confirmed", "in_progress", "ready", "delivered", "cancelled"]).optional(),
  expectedUpdatedAt: z.string().datetime(),
}).strict().refine((value) => value.paymentStatus || value.fulfillmentStatus, "At least one status is required");

export const inquiryUpdateSchema = z.object({
  status: z.enum(["new", "contacted", "qualified", "won", "lost", "spam"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  assignedAdminId: z.string().uuid().nullable().optional(),
  expectedUpdatedAt: z.string().datetime(),
}).strict().refine((value) => value.status || value.priority || value.assignedAdminId !== undefined, "At least one inquiry change is required");

export const ticketUpdateSchema = z.object({
  status: z.enum(["open", "pending_customer", "pending_team", "resolved", "closed"]).optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  assignedAdminId: z.string().uuid().nullable().optional(),
  expectedUpdatedAt: z.string().datetime(),
}).strict().refine((value) => value.status || value.severity || value.assignedAdminId !== undefined, "At least one ticket change is required");

export const dateRangeSchema = z.object({
  from: z.string().date(),
  to: z.string().date(),
  granularity: z.enum(["day", "week", "month"]).default("day"),
});
