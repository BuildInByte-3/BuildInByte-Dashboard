import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPreviewMode } from "@/lib/env";

export type Row = Record<string, unknown>;

function raise(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export function defaultRange(days = 30) {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}

export async function getOverview(from: string, to: string) {
  if (isPreviewMode()) return {
    overview: { total_users: 128, user_growth_percent: 18.5, net_sales_inr_minor: 84500000, sales_growth_percent: 12.4, profit_inr_minor: 53600000, pending_orders: 7, gross_sales_inr_minor: 91000000, refunds_inr_minor: 1500000, open_inquiries: 14, open_tickets: 5 },
    series: [
      { bucket: "Week 1", net_sales_inr_minor: 15500000, profit_inr_minor: 9200000 },
      { bucket: "Week 2", net_sales_inr_minor: 18800000, profit_inr_minor: 11700000 },
      { bucket: "Week 3", net_sales_inr_minor: 22100000, profit_inr_minor: 14100000 },
      { bucket: "Week 4", net_sales_inr_minor: 28100000, profit_inr_minor: 18600000 },
    ],
  };
  const client = createAdminClient();
  const [{ data: overview, error: overviewError }, { data: series, error: seriesError }] = await Promise.all([
    client.rpc("dashboard_overview", { p_from: from, p_to: to }),
    client.rpc("dashboard_timeseries", { p_from: from, p_to: to, p_granularity: "day" }),
  ]);
  raise(overviewError);
  raise(seriesError);
  return { overview: (overview || {}) as Row, series: (series || []) as Row[] };
}

export async function getUsers() {
  if (isPreviewMode()) return [{ id: "preview-user", email: "customer@example.test", full_name: "Preview Customer", company: "Example Company", phone: null, occupation: "Founder", city: "Bengaluru", region: "Karnataka", country_code: "IN", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }];
  const client = createAdminClient();
  const { data, error } = await client.from("profiles").select("id,email,full_name,company,phone,occupation,city,region,country_code,created_at,updated_at").order("created_at", { ascending: false }).limit(500);
  raise(error);
  return (data || []) as Row[];
}

export async function getOrders() {
  if (isPreviewMode()) {
    const now = Date.now();
    return [
      { id: "preview-order-1", order_number: "BIB-2048", buyer_email: "meera@example.test", currency: "INR", total_minor: 2500000, total_inr_minor: 2500000, payment_status: "paid", fulfillment_status: "in_progress", customer_city: "Bengaluru", customer_country_code: "IN", created_at: new Date(now).toISOString(), updated_at: new Date(now).toISOString() },
      { id: "preview-order-2", order_number: "BIB-2047", buyer_email: "arjun@example.test", currency: "INR", total_minor: 1850000, total_inr_minor: 1850000, payment_status: "paid", fulfillment_status: "confirmed", customer_city: "Hyderabad", customer_country_code: "IN", created_at: new Date(now - 86400000).toISOString(), updated_at: new Date(now - 86400000).toISOString() },
      { id: "preview-order-3", order_number: "BIB-2046", buyer_email: "nisha@example.test", currency: "INR", total_minor: 3200000, total_inr_minor: 3200000, payment_status: "pending", fulfillment_status: "new", customer_city: "Mumbai", customer_country_code: "IN", created_at: new Date(now - 172800000).toISOString(), updated_at: new Date(now - 172800000).toISOString() },
      { id: "preview-order-4", order_number: "BIB-2045", buyer_email: "vikram@example.test", currency: "INR", total_minor: 1450000, total_inr_minor: 1450000, payment_status: "paid", fulfillment_status: "ready", customer_city: "Chennai", customer_country_code: "IN", created_at: new Date(now - 259200000).toISOString(), updated_at: new Date(now - 259200000).toISOString() },
    ];
  }
  const client = createAdminClient();
  const { data, error } = await client.from("orders").select("id,order_number,buyer_email,currency,total_minor,total_inr_minor,payment_status,fulfillment_status,customer_city,customer_country_code,created_at,updated_at").order("created_at", { ascending: false }).limit(500);
  raise(error);
  return (data || []) as Row[];
}

export async function getFinance(from: string, to: string) {
  if (isPreviewMode()) return {
    payments: [{ id: "preview-payment", order_id: "preview-order", provider: "manual", method: "bank_transfer", status: "captured", amount_minor: 2500000, amount_inr_minor: 2500000, currency: "INR", paid_at: new Date().toISOString(), refunded_at: null, created_at: new Date().toISOString() }],
    costs: [{ id: "preview-cost", order_id: "preview-order", category: "software", description: "Preview project costs", amount_inr_minor: 750000, incurred_at: new Date().toISOString(), created_at: new Date().toISOString() }],
  };
  const client = createAdminClient();
  const [{ data: payments, error: paymentError }, { data: costs, error: costError }] = await Promise.all([
    client.from("payments").select("id,order_id,provider,method,status,amount_minor,amount_inr_minor,currency,paid_at,refunded_at,created_at").gte("created_at", from).lt("created_at", to).order("created_at", { ascending: false }).limit(500),
    client.from("order_costs").select("id,order_id,category,description,amount_inr_minor,incurred_at,created_at").gte("created_at", from).lt("created_at", to).order("created_at", { ascending: false }).limit(500),
  ]);
  raise(paymentError);
  raise(costError);
  return { payments: (payments || []) as Row[], costs: (costs || []) as Row[] };
}

export async function getGeography() {
  if (isPreviewMode()) return { customers: [{ country_code: "IN", region: "Karnataka", city: "Bengaluru" }], visitors: [{ day: new Date().toISOString().slice(0, 10), country_code: "IN", region: "Karnataka", city: "Bengaluru", visitors: 42, sessions: 57, page_views: 130 }] };
  const client = createAdminClient();
  const [{ data: customers, error: customerError }, { data: visitors, error: visitorError }] = await Promise.all([
    client.from("profiles").select("country_code,region,city").not("country_code", "is", null).limit(5000),
    client.from("analytics_daily").select("day,country_code,region,city,visitors,sessions,page_views").order("day", { ascending: false }).limit(5000),
  ]);
  raise(customerError);
  raise(visitorError);
  return { customers: (customers || []) as Row[], visitors: (visitors || []) as Row[] };
}

export async function getInquiries() {
  if (isPreviewMode()) return [{ id: "preview-inquiry", name: "Preview Lead", email: "lead@example.test", company: "Example Company", project_type: "Custom platform", message: "Preview-only inquiry", status: "qualified", priority: "high", assigned_admin_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }];
  const client = createAdminClient();
  const { data, error } = await client.from("inquiries").select("id,name,email,company,project_type,message,status,priority,assigned_admin_id,created_at,updated_at").order("created_at", { ascending: false }).limit(500);
  raise(error);
  return (data || []) as Row[];
}

export async function getSupport() {
  if (isPreviewMode()) return [{ id: "preview-ticket", ticket_number: "PREVIEW-101", subject: "Preview support request", status: "open", severity: "medium", customer_email: "customer@example.test", order_id: "preview-order", assigned_admin_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }];
  const client = createAdminClient();
  const { data, error } = await client.from("support_tickets").select("id,ticket_number,subject,status,severity,customer_email,order_id,assigned_admin_id,created_at,updated_at").order("created_at", { ascending: false }).limit(500);
  raise(error);
  return (data || []) as Row[];
}

export async function getAuditLog() {
  if (isPreviewMode()) return [{ id: "preview-audit", action: "preview.session", entity_type: "local_preview", entity_id: null, metadata: { persisted: false }, created_at: new Date().toISOString(), admin_accounts: { email: process.env.DASHBOARD_PREVIEW_EMAIL, display_name: "Local Preview" } }];
  const client = createAdminClient();
  const { data, error } = await client.from("admin_audit_log").select("id,action,entity_type,entity_id,metadata,created_at,admin_accounts(email,display_name)").order("created_at", { ascending: false }).limit(500);
  raise(error);
  return (data || []) as Row[];
}

export async function getAdmins() {
  if (isPreviewMode()) return [{ id: "local-preview", email: process.env.DASHBOARD_PREVIEW_EMAIL, display_name: "Local Preview", role: "owner", is_active: true, mfa_enabled: false, last_login_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }];
  const client = createAdminClient();
  const { data, error } = await client.from("admin_accounts").select("id,email,display_name,role,is_active,mfa_enabled,last_login_at,created_at,updated_at").order("created_at", { ascending: true });
  raise(error);
  return (data || []) as Row[];
}
