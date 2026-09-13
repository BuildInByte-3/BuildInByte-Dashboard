-- BuildInByte dashboard foundation.
-- Review against a schema pulled from staging before production application.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = timezone('utc', now()); return new; end;
$$;

create table if not exists public.admin_accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  password_hash text not null,
  role text not null default 'analyst' check (role in ('owner','administrator','finance','support','analyst')),
  mfa_secret_encrypted text,
  mfa_enabled boolean not null default false,
  is_active boolean not null default true,
  locked_until timestamptz,
  password_changed_at timestamptz not null default timezone('utc', now()),
  last_login_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.admin_accounts(id) on delete cascade,
  token_hash text not null unique,
  user_agent_hash text not null,
  created_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  constraint admin_session_expiry check (expires_at > created_at)
);

create table if not exists public.admin_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.admin_accounts(id) on delete cascade,
  code_hash text not null,
  created_at timestamptz not null default timezone('utc', now()),
  used_at timestamptz,
  unique(admin_id, code_hash)
);

create table if not exists public.admin_login_attempts (
  id bigint generated always as identity primary key,
  admin_id uuid references public.admin_accounts(id) on delete set null,
  ip_hash text not null,
  identity_hash text not null,
  succeeded boolean not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid references public.admin_accounts(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists admin_sessions_token_idx on public.admin_sessions(token_hash) where revoked_at is null;
create index if not exists admin_sessions_admin_idx on public.admin_sessions(admin_id, expires_at desc);
create index if not exists admin_login_ip_idx on public.admin_login_attempts(ip_hash, created_at desc) where succeeded = false;
create index if not exists admin_login_identity_idx on public.admin_login_attempts(identity_hash, created_at desc) where succeeded = false;
create index if not exists admin_audit_created_idx on public.admin_audit_log(created_at desc);

drop trigger if exists admin_accounts_updated_at on public.admin_accounts;
create trigger admin_accounts_updated_at before update on public.admin_accounts for each row execute function public.set_updated_at();

create or replace function public.prevent_last_active_owner()
returns trigger language plpgsql set search_path=public as $$
begin
  if old.role = 'owner' and old.is_active = true then
    if tg_op = 'DELETE' or new.role <> 'owner' or new.is_active = false then
      perform pg_advisory_xact_lock(hashtext('buildinbyte-active-owner'));
      if not exists (
        select 1 from public.admin_accounts
        where id <> old.id and role = 'owner' and is_active = true
      ) then raise exception 'At least one active owner is required'; end if;
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists admin_accounts_owner_guard on public.admin_accounts;
create trigger admin_accounts_owner_guard before update of role,is_active or delete on public.admin_accounts for each row execute function public.prevent_last_active_owner();

create or replace function public.check_admin_login_limit(p_ip_hash text, p_identity_hash text)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare failures integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_ip_hash), hashtext(p_identity_hash));
  select count(*) into failures
  from public.admin_login_attempts
  where succeeded = false
    and created_at > timezone('utc', now()) - interval '15 minutes'
    and (ip_hash = p_ip_hash or identity_hash = p_identity_hash);
  return failures < 5;
end;
$$;

revoke all on function public.check_admin_login_limit(text,text) from public, anon, authenticated;
grant execute on function public.check_admin_login_limit(text,text) to service_role;

create or replace function public.apply_admin_lockout()
returns trigger language plpgsql security definer set search_path = public as $$
declare recent_failures integer;
begin
  if new.succeeded or new.admin_id is null then return new; end if;
  select count(*) into recent_failures from public.admin_login_attempts
    where admin_id = new.admin_id and succeeded = false
      and created_at > timezone('utc', now()) - interval '1 hour';
  if recent_failures >= 5 then
    update public.admin_accounts
      set locked_until = timezone('utc', now()) + make_interval(mins => least(60, 15 * (recent_failures / 5)))
      where id = new.admin_id;
  end if;
  return new;
end;
$$;

drop trigger if exists admin_login_lockout on public.admin_login_attempts;
create trigger admin_login_lockout after insert on public.admin_login_attempts for each row execute function public.apply_admin_lockout();

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  phone text,
  occupation text,
  company text,
  location_raw text,
  city text,
  region text,
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists occupation text;
alter table public.profiles add column if not exists company text;
alter table public.profiles add column if not exists location_raw text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists region text;
alter table public.profiles add column if not exists country_code text;
alter table public.profiles add column if not exists created_at timestamptz default timezone('utc', now());
alter table public.profiles add column if not exists updated_at timestamptz default timezone('utc', now());

create or replace function public.handle_auth_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id,email,full_name,avatar_url,phone,occupation,company,location_raw,created_at,updated_at)
  values(new.id,new.email,new.raw_user_meta_data->>'full_name',coalesce(new.raw_user_meta_data->>'avatar_url',new.raw_user_meta_data->>'picture'),new.raw_user_meta_data->>'phone_number',new.raw_user_meta_data->>'occupation',new.raw_user_meta_data->>'company',new.raw_user_meta_data->>'location',new.created_at,timezone('utc',now()))
  on conflict(id) do update set email=excluded.email,full_name=excluded.full_name,avatar_url=excluded.avatar_url,phone=excluded.phone,occupation=excluded.occupation,company=excluded.company,location_raw=excluded.location_raw,updated_at=timezone('utc',now());
  return new;
end;
$$;

drop trigger if exists auth_user_profile_sync on auth.users;
create trigger auth_user_profile_sync after insert or update of email,raw_user_meta_data on auth.users for each row execute function public.handle_auth_profile();

insert into public.profiles(id,email,full_name,avatar_url,phone,occupation,company,location_raw,created_at,updated_at)
select id,email,raw_user_meta_data->>'full_name',coalesce(raw_user_meta_data->>'avatar_url',raw_user_meta_data->>'picture'),raw_user_meta_data->>'phone_number',raw_user_meta_data->>'occupation',raw_user_meta_data->>'company',raw_user_meta_data->>'location',created_at,timezone('utc',now()) from auth.users
on conflict(id) do nothing;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique,
  user_id uuid references auth.users(id) on delete set null,
  buyer_email text,
  currency text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  subtotal_minor bigint not null default 0 check (subtotal_minor >= 0),
  discount_minor bigint not null default 0 check (discount_minor >= 0),
  tax_minor bigint not null default 0 check (tax_minor >= 0),
  refund_minor bigint not null default 0 check (refund_minor >= 0),
  total_minor bigint not null default 0 check (total_minor >= 0),
  fx_rate_to_inr numeric(20,8) not null default 1 check (fx_rate_to_inr > 0),
  subtotal_inr_minor bigint not null default 0,
  discount_inr_minor bigint not null default 0,
  refund_inr_minor bigint not null default 0,
  total_inr_minor bigint not null default 0,
  payment_status text not null default 'pending' check (payment_status in ('pending','authorized','paid','partially_refunded','refunded','failed','cancelled')),
  fulfillment_status text not null default 'new' check (fulfillment_status in ('new','confirmed','in_progress','ready','delivered','cancelled')),
  sales_channel text not null default 'dashboard',
  customer_city text,
  customer_region text,
  customer_country_code text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.orders add column if not exists order_number text;
alter table public.orders add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.orders add column if not exists buyer_email text;
alter table public.orders add column if not exists currency text default 'INR';
alter table public.orders add column if not exists subtotal_minor bigint default 0;
alter table public.orders add column if not exists discount_minor bigint default 0;
alter table public.orders add column if not exists tax_minor bigint default 0;
alter table public.orders add column if not exists refund_minor bigint default 0;
alter table public.orders add column if not exists total_minor bigint default 0;
alter table public.orders add column if not exists fx_rate_to_inr numeric(20,8) default 1;
alter table public.orders add column if not exists subtotal_inr_minor bigint default 0;
alter table public.orders add column if not exists discount_inr_minor bigint default 0;
alter table public.orders add column if not exists refund_inr_minor bigint default 0;
alter table public.orders add column if not exists total_inr_minor bigint default 0;
alter table public.orders add column if not exists payment_status text default 'pending';
alter table public.orders add column if not exists fulfillment_status text default 'new';
alter table public.orders add column if not exists sales_channel text default 'dashboard';
alter table public.orders add column if not exists customer_city text;
alter table public.orders add column if not exists customer_region text;
alter table public.orders add column if not exists customer_country_code text;
alter table public.orders add column if not exists notes text;
alter table public.orders add column if not exists updated_at timestamptz default timezone('utc', now());
-- Temporary compatibility fields used by the existing customer desk. They can
-- be retired only after the website reads the normalized money/status fields.
alter table public.orders add column if not exists status text default 'pending';
alter table public.orders add column if not exists amount_usd numeric(14,2) default 0;

update public.orders set payment_status = case lower(status)
  when 'paid' then 'paid'
  when 'refunded' then 'refunded'
  when 'cancelled' then 'cancelled'
  when 'failed' then 'failed'
  else coalesce(payment_status,'pending') end
where status is not null;

create or replace function public.sync_order_legacy_status()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' and new.status is not null and new.payment_status = 'pending' then
    new.payment_status := case lower(new.status)
      when 'paid' then 'paid' when 'refunded' then 'refunded'
      when 'cancelled' then 'cancelled' when 'failed' then 'failed'
      else 'pending' end;
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status and new.payment_status is not distinct from old.payment_status then
    new.payment_status := case lower(new.status)
      when 'paid' then 'paid' when 'refunded' then 'refunded'
      when 'cancelled' then 'cancelled' when 'failed' then 'failed'
      else 'pending' end;
  elsif tg_op = 'UPDATE' and new.payment_status is distinct from old.payment_status then
    new.status := new.payment_status;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_legacy_status_sync on public.orders;
create trigger orders_legacy_status_sync before insert or update of status,payment_status on public.orders for each row execute function public.sync_order_legacy_status();

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid,
  description text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price_minor bigint not null default 0 check (unit_price_minor >= 0),
  total_minor bigint not null default 0 check (total_minor >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.order_items add column if not exists product_id uuid;
alter table public.order_items add column if not exists description text;
alter table public.order_items add column if not exists quantity integer default 1;
alter table public.order_items add column if not exists unit_price_minor bigint default 0;
alter table public.order_items add column if not exists total_minor bigint default 0;
alter table public.order_items add column if not exists created_at timestamptz default timezone('utc', now());

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'manual',
  provider_payment_id text,
  method text,
  status text not null default 'pending',
  currency text not null default 'INR',
  amount_minor bigint not null default 0 check (amount_minor >= 0),
  amount_inr_minor bigint not null default 0 check (amount_inr_minor >= 0),
  idempotency_key text unique,
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.order_costs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  category text not null check (category in ('processor_fee','contractor','delivery','hosting','software','other')),
  description text,
  amount_inr_minor bigint not null check (amount_inr_minor >= 0),
  incurred_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.fx_rates (
  rate_date date not null,
  currency text not null,
  inr_per_unit numeric(20,8) not null check (inr_per_unit > 0),
  source text not null default 'manual',
  created_at timestamptz not null default timezone('utc', now()),
  primary key(rate_date,currency)
);

create index if not exists orders_created_idx on public.orders(created_at desc);
create index if not exists orders_user_idx on public.orders(user_id, created_at desc);
create index if not exists orders_email_idx on public.orders(lower(buyer_email), created_at desc);
create index if not exists orders_status_idx on public.orders(payment_status, fulfillment_status, created_at desc);
create index if not exists payment_order_idx on public.payments(order_id, created_at desc);
create index if not exists costs_order_idx on public.order_costs(order_id, incurred_at desc);
drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at before update on public.orders for each row execute function public.set_updated_at();
drop trigger if exists payments_updated_at on public.payments;
create trigger payments_updated_at before update on public.payments for each row execute function public.set_updated_at();

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  company text,
  project_type text,
  scope text,
  message text,
  status text not null default 'new',
  priority text not null default 'normal',
  assigned_admin_id uuid references public.admin_accounts(id) on delete set null,
  converted_order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.inquiries add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.inquiries add column if not exists company text;
alter table public.inquiries add column if not exists scope text;
alter table public.inquiries add column if not exists priority text default 'normal';
alter table public.inquiries add column if not exists assigned_admin_id uuid references public.admin_accounts(id) on delete set null;
alter table public.inquiries add column if not exists converted_order_id uuid references public.orders(id) on delete set null;
alter table public.inquiries add column if not exists updated_at timestamptz default timezone('utc', now());
create index if not exists inquiries_status_idx on public.inquiries(status, created_at desc);
drop trigger if exists inquiries_updated_at on public.inquiries;
create trigger inquiries_updated_at before update on public.inquiries for each row execute function public.set_updated_at();

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  customer_email text,
  order_id uuid references public.orders(id) on delete set null,
  subject text not null,
  status text not null default 'open' check (status in ('open','pending_customer','pending_team','resolved','closed')),
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  assigned_admin_id uuid references public.admin_accounts(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  author_admin_id uuid references public.admin_accounts(id) on delete set null,
  author_type text not null check (author_type in ('customer','admin','system')),
  body text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ticket_events (
  id bigint generated always as identity primary key,
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  admin_id uuid references public.admin_accounts(id) on delete set null,
  event_type text not null,
  changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists tickets_status_idx on public.support_tickets(status,severity,created_at desc);
create index if not exists ticket_messages_idx on public.support_messages(ticket_id,created_at);
drop trigger if exists support_tickets_updated_at on public.support_tickets;
create trigger support_tickets_updated_at before update on public.support_tickets for each row execute function public.set_updated_at();

create table if not exists public.visitor_events (
  id bigint generated always as identity primary key,
  event_id uuid not null unique,
  anonymous_id_hash text not null,
  session_id_hash text not null,
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null,
  path text not null,
  referrer_domain text,
  device_class text,
  country_code text,
  region text,
  city text,
  occurred_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.analytics_daily (
  day date not null,
  country_code text not null default '',
  region text not null default '',
  city text not null default '',
  visitors bigint not null default 0,
  sessions bigint not null default 0,
  page_views bigint not null default 0,
  events bigint not null default 0,
  primary key(day,country_code,region,city)
);

create index if not exists visitor_events_time_idx on public.visitor_events(occurred_at desc);
create index if not exists visitor_events_geo_idx on public.visitor_events(country_code,region,city,occurred_at desc);

create or replace function public.record_visitor_event(
  p_event_id uuid, p_anonymous_id_hash text, p_session_id_hash text, p_user_id uuid,
  p_event_name text, p_path text, p_referrer_domain text, p_device_class text,
  p_country_code text, p_region text, p_city text
) returns boolean language plpgsql security definer set search_path=public as $$
declare
  inserted_count integer;
  event_day date := (timezone('Asia/Kolkata', now()))::date;
  visitor_increment bigint := 0;
  session_increment bigint := 0;
begin
  -- Count a consented browser and session once per reporting day. These checks
  -- happen before the insert so retries remain idempotent through event_id.
  perform pg_advisory_xact_lock(hashtext('visitor:' || p_anonymous_id_hash), hashtext(event_day::text));
  perform pg_advisory_xact_lock(hashtext('session:' || p_session_id_hash), hashtext(event_day::text));
  if not exists (
    select 1 from public.visitor_events
    where anonymous_id_hash = p_anonymous_id_hash
      and (timezone('Asia/Kolkata', occurred_at))::date = event_day
  ) then visitor_increment := 1; end if;
  if not exists (
    select 1 from public.visitor_events
    where session_id_hash = p_session_id_hash
      and (timezone('Asia/Kolkata', occurred_at))::date = event_day
  ) then session_increment := 1; end if;

  insert into public.visitor_events(event_id,anonymous_id_hash,session_id_hash,user_id,event_name,path,referrer_domain,device_class,country_code,region,city)
  values(p_event_id,p_anonymous_id_hash,p_session_id_hash,p_user_id,p_event_name,left(p_path,500),p_referrer_domain,p_device_class,p_country_code,p_region,p_city)
  on conflict(event_id) do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count = 0 then return false; end if;
  insert into public.analytics_daily(day,country_code,region,city,visitors,sessions,page_views,events)
  values(event_day,coalesce(p_country_code,''),coalesce(p_region,''),coalesce(p_city,''),visitor_increment,session_increment,case when p_event_name='page_view' then 1 else 0 end,1)
  on conflict(day,country_code,region,city) do update set
    visitors=public.analytics_daily.visitors+excluded.visitors,
    sessions=public.analytics_daily.sessions+excluded.sessions,
    page_views=public.analytics_daily.page_views+excluded.page_views,
    events=public.analytics_daily.events+excluded.events;
  return true;
end;
$$;
revoke all on function public.record_visitor_event(uuid,text,text,uuid,text,text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.record_visitor_event(uuid,text,text,uuid,text,text,text,text,text,text,text) to service_role;

create table if not exists public.public_rate_limits (
  bucket text not null,
  identity_hash text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 1,
  primary key(bucket,identity_hash,window_started_at)
);

create or replace function public.consume_public_rate_limit(p_bucket text,p_identity_hash text,p_window_seconds integer,p_max_requests integer)
returns boolean language plpgsql security definer set search_path=public as $$
declare window_start timestamptz; next_count integer;
begin
  if p_window_seconds < 1 or p_max_requests < 1 then return false; end if;
  window_start := to_timestamp(floor(extract(epoch from timezone('utc',now()))/p_window_seconds)*p_window_seconds);
  insert into public.public_rate_limits(bucket,identity_hash,window_started_at,request_count)
  values(p_bucket,p_identity_hash,window_start,1)
  on conflict(bucket,identity_hash,window_started_at) do update set request_count=public.public_rate_limits.request_count+1
  returning request_count into next_count;
  return next_count <= p_max_requests;
end;
$$;
revoke all on function public.consume_public_rate_limit(text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_public_rate_limit(text,text,integer,integer) to service_role;

create or replace function public.prune_dashboard_operational_data()
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  rate_limits_deleted integer;
  attempts_deleted integer;
  sessions_deleted integer;
  events_deleted integer;
begin
  delete from public.public_rate_limits where window_started_at < now() - interval '2 days';
  get diagnostics rate_limits_deleted = row_count;
  delete from public.admin_login_attempts where created_at < now() - interval '90 days';
  get diagnostics attempts_deleted = row_count;
  delete from public.admin_sessions where (revoked_at is not null or expires_at < now()) and created_at < now() - interval '30 days';
  get diagnostics sessions_deleted = row_count;
  delete from public.visitor_events where occurred_at < now() - interval '90 days';
  get diagnostics events_deleted = row_count;
  return jsonb_build_object('rate_limits',rate_limits_deleted,'login_attempts',attempts_deleted,'sessions',sessions_deleted,'visitor_events',events_deleted);
end;
$$;
revoke all on function public.prune_dashboard_operational_data() from public,anon,authenticated;
grant execute on function public.prune_dashboard_operational_data() to service_role;

create or replace function public.dashboard_overview(p_from timestamptz,p_to timestamptz)
returns jsonb language sql security definer set search_path=public stable as $$
with bounds as (select p_from f,p_to t,p_to-p_from span),
current_orders as (
  select coalesce(sum(subtotal_inr_minor),0) gross,
    coalesce(sum(subtotal_inr_minor-discount_inr_minor-refund_inr_minor),0) net,
    coalesce(sum(refund_inr_minor),0) refunds
  from public.orders,bounds where created_at>=f and created_at<t and payment_status in ('paid','partially_refunded','refunded')
), previous_orders as (
  select coalesce(sum(subtotal_inr_minor-discount_inr_minor-refund_inr_minor),0) net
  from public.orders,bounds where created_at>=f-span and created_at<f and payment_status in ('paid','partially_refunded','refunded')
), current_costs as (select coalesce(sum(amount_inr_minor),0) costs from public.order_costs,bounds where incurred_at>=f and incurred_at<t),
current_users as (select count(*) count from public.profiles,bounds where created_at>=f and created_at<t),
previous_users as (select count(*) count from public.profiles,bounds where created_at>=f-span and created_at<f)
select jsonb_build_object(
  'total_users',(select count(*) from public.profiles),
  'new_users',(select count from current_users),
  'user_growth_percent',case when (select count from previous_users)=0 then null else round(100.0*((select count from current_users)-(select count from previous_users))/(select count from previous_users),1) end,
  'gross_sales_inr_minor',(select gross from current_orders),
  'net_sales_inr_minor',(select net from current_orders),
  'refunds_inr_minor',(select refunds from current_orders),
  'profit_inr_minor',(select net from current_orders)-(select costs from current_costs),
  'sales_growth_percent',case when (select net from previous_orders)=0 then null else round(100.0*((select net from current_orders)-(select net from previous_orders))/(select net from previous_orders),1) end,
  'pending_orders',(select count(*) from public.orders where fulfillment_status in ('new','confirmed','in_progress','ready')),
  'open_inquiries',(select count(*) from public.inquiries where status in ('new','contacted','qualified')),
  'open_tickets',(select count(*) from public.support_tickets where status in ('open','pending_customer','pending_team'))
);
$$;

create or replace function public.dashboard_timeseries(p_from timestamptz,p_to timestamptz,p_granularity text default 'day')
returns table(bucket timestamptz,gross_sales_inr_minor bigint,net_sales_inr_minor bigint,refunds_inr_minor bigint,costs_inr_minor bigint,profit_inr_minor bigint,orders bigint)
language plpgsql security definer set search_path=public stable as $$
begin
  if p_granularity not in ('day','week','month') then raise exception 'Invalid granularity'; end if;
  return query with sales as (
    select date_trunc(p_granularity,created_at at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata' b,
      sum(subtotal_inr_minor)::bigint gross,
      sum(subtotal_inr_minor-discount_inr_minor-refund_inr_minor)::bigint net,
      sum(refund_inr_minor)::bigint refunds,count(*)::bigint orders
    from public.orders where created_at>=p_from and created_at<p_to and payment_status in ('paid','partially_refunded','refunded') group by 1
  ), costs as (
    select date_trunc(p_granularity,incurred_at at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata' b,sum(amount_inr_minor)::bigint costs
    from public.order_costs where incurred_at>=p_from and incurred_at<p_to group by 1
  ) select coalesce(s.b,c.b),coalesce(s.gross,0),coalesce(s.net,0),coalesce(s.refunds,0),coalesce(c.costs,0),coalesce(s.net,0)-coalesce(c.costs,0),coalesce(s.orders,0)
    from sales s full outer join costs c on c.b=s.b order by 1;
end;
$$;

revoke all on function public.dashboard_overview(timestamptz,timestamptz) from public,anon,authenticated;
revoke all on function public.dashboard_timeseries(timestamptz,timestamptz,text) from public,anon,authenticated;
grant execute on function public.dashboard_overview(timestamptz,timestamptz) to service_role;
grant execute on function public.dashboard_timeseries(timestamptz,timestamptz,text) to service_role;

alter table public.admin_accounts enable row level security;
alter table public.admin_sessions enable row level security;
alter table public.admin_recovery_codes enable row level security;
alter table public.admin_login_attempts enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.order_costs enable row level security;
alter table public.fx_rates enable row level security;
alter table public.inquiries enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.ticket_events enable row level security;
alter table public.visitor_events enable row level security;
alter table public.analytics_daily enable row level security;
alter table public.public_rate_limits enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using (id=auth.uid());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());
drop policy if exists orders_select_own on public.orders;
create policy orders_select_own on public.orders for select to authenticated using (user_id=auth.uid() or lower(buyer_email)=lower(auth.jwt()->>'email'));
drop policy if exists order_items_select_own on public.order_items;
create policy order_items_select_own on public.order_items for select to authenticated using (exists(select 1 from public.orders o where o.id=order_id and (o.user_id=auth.uid() or lower(o.buyer_email)=lower(auth.jwt()->>'email'))));
drop policy if exists tickets_select_own on public.support_tickets;
create policy tickets_select_own on public.support_tickets for select to authenticated using (user_id=auth.uid() or lower(customer_email)=lower(auth.jwt()->>'email'));
drop policy if exists messages_select_own on public.support_messages;
create policy messages_select_own on public.support_messages for select to authenticated using (exists(select 1 from public.support_tickets t where t.id=ticket_id and (t.user_id=auth.uid() or lower(t.customer_email)=lower(auth.jwt()->>'email'))));

revoke all on public.admin_accounts,public.admin_sessions,public.admin_recovery_codes,public.admin_login_attempts,public.admin_audit_log,public.payments,public.order_costs,public.fx_rates,public.visitor_events,public.analytics_daily,public.public_rate_limits from anon,authenticated;

-- RLS still requires table privileges. Customers receive only the operations
-- covered by the own-record policies above; administrative access uses the
-- server-only service role and bypasses these grants.
grant select on public.profiles,public.orders,public.order_items,public.support_tickets,public.support_messages to authenticated;
grant update(full_name,avatar_url,phone,occupation,company,location_raw,city,region,country_code) on public.profiles to authenticated;

comment on table public.visitor_events is 'Consented analytics only. Raw IP addresses are prohibited.';
comment on table public.admin_audit_log is 'Append-only administrative audit trail; application roles must never update or delete rows.';
