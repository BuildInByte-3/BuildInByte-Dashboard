export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type GenericRow = Record<string, unknown>;
type GenericTable = {
  Row: GenericRow;
  Insert: GenericRow;
  Update: GenericRow;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      admin_accounts: GenericTable;
      admin_sessions: GenericTable;
      admin_recovery_codes: GenericTable;
      admin_login_attempts: GenericTable;
      admin_audit_log: GenericTable;
      profiles: GenericTable;
      orders: GenericTable;
      order_items: GenericTable;
      payments: GenericTable;
      order_costs: GenericTable;
      fx_rates: GenericTable;
      inquiries: GenericTable;
      support_tickets: GenericTable;
      support_messages: GenericTable;
      ticket_events: GenericTable;
      visitor_events: GenericTable;
      analytics_daily: GenericTable;
    };
    Views: Record<string, never>;
    Functions: {
      dashboard_overview: { Args: { p_from: string; p_to: string }; Returns: Json };
      dashboard_timeseries: { Args: { p_from: string; p_to: string; p_granularity: string }; Returns: GenericRow[] };
      check_admin_login_limit: { Args: { p_ip_hash: string; p_identity_hash: string }; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// Replace this checked-in compatibility type with `supabase gen types typescript`
// after linking the staging project. It intentionally contains no production data.
