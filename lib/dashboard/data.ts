import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const client = createAdminClient();
  const { data, error } = await client.from("profiles").select("id,email,full_name,company,phone,occupation,city,region,country_code,created_at,updated_at").order("created_at", { ascending: false }).limit(500);
  raise(error);
  return (data || []) as Row[];
}

export async function getOrders() {
  const client = createAdminClient();
  const { data, error } = await client.from("orders").select("id,order_number,buyer_email,currency,total_minor,total_inr_minor,payment_status,fulfillment_status,customer_city,customer_country_code,created_at,updated_at").order("created_at", { ascending: false }).limit(500);
  raise(error);
  return (data || []) as Row[];
}

export async function getFinance(from: string, to: string) {
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
  const client = createAdminClient();
  const { data, error } = await client.from("inquiries").select("id,name,email,company,project_type,message,status,priority,assigned_admin_id,created_at,updated_at").order("created_at", { ascending: false }).limit(500);
  raise(error);
  return (data || []) as Row[];
}

export async function getSupport() {
  const client = createAdminClient();
  const { data, error } = await client.from("support_tickets").select("id,ticket_number,subject,status,severity,customer_email,order_id,assigned_admin_id,created_at,updated_at").order("created_at", { ascending: false }).limit(500);
  raise(error);
  return (data || []) as Row[];
}

export async function getAuditLog() {
  const client = createAdminClient();
  const { data, error } = await client.from("admin_audit_log").select("id,action,entity_type,entity_id,metadata,created_at,admin_accounts(email,display_name)").order("created_at", { ascending: false }).limit(500);
  raise(error);
  return (data || []) as Row[];
}

export async function getAdmins() {
  const client = createAdminClient();
  const { data, error } = await client.from("admin_accounts").select("id,email,display_name,role,is_active,mfa_enabled,last_login_at,created_at,updated_at").order("created_at", { ascending: true });
  raise(error);
  return (data || []) as Row[];
}
