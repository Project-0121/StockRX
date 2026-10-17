-- =====================================================================
-- PharmaTrack: Migration 004 - RLS & Security Policies
-- =====================================================================

-- Security helpers
create or replace function is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and is_active = true
  );
$$;

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and is_active = true and role = 'admin'
  );
$$;

-- Revoke write privileges from anon and authenticated across public schema
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;

revoke insert, update, delete on all tables in schema public from authenticated;
grant select on all tables in schema public to authenticated;
grant select on public.v_batch_status, public.v_medicine_stock, public.v_dashboard_summary to authenticated;
grant usage on schema public to authenticated;

-- Enable Row Level Security (RLS) on all tables
alter table app_settings enable row level security;
alter table profiles enable row level security;
alter table categories enable row level security;
alter table suppliers enable row level security;
alter table medicines enable row level security;
alter table batches enable row level security;
alter table purchases enable row level security;
alter table purchase_items enable row level security;
alter table stock_movements enable row level security;
alter table alerts_log enable row level security;

-- 1. PROFILES POLICIES
drop policy if exists "profiles_select_policy" on profiles;
create policy "profiles_select_policy"
  on profiles
  for select
  to authenticated
  using (id = auth.uid() or is_admin());

-- 2. APP SETTINGS POLICIES
drop policy if exists "app_settings_select_policy" on app_settings;
create policy "app_settings_select_policy"
  on app_settings
  for select
  to authenticated
  using (is_active_user());

-- 3. CATEGORIES POLICIES
drop policy if exists "categories_select_policy" on categories;
create policy "categories_select_policy"
  on categories
  for select
  to authenticated
  using (is_active_user());

-- 4. SUPPLIERS POLICIES
drop policy if exists "suppliers_select_policy" on suppliers;
create policy "suppliers_select_policy"
  on suppliers
  for select
  to authenticated
  using (is_active_user());

-- 5. MEDICINES POLICIES
drop policy if exists "medicines_select_policy" on medicines;
create policy "medicines_select_policy"
  on medicines
  for select
  to authenticated
  using (is_active_user());

-- 6. BATCHES POLICIES
drop policy if exists "batches_select_policy" on batches;
create policy "batches_select_policy"
  on batches
  for select
  to authenticated
  using (is_active_user());

-- 7. PURCHASES POLICIES
drop policy if exists "purchases_select_policy" on purchases;
create policy "purchases_select_policy"
  on purchases
  for select
  to authenticated
  using (is_active_user());

-- 8. PURCHASE ITEMS POLICIES
drop policy if exists "purchase_items_select_policy" on purchase_items;
create policy "purchase_items_select_policy"
  on purchase_items
  for select
  to authenticated
  using (is_active_user());

-- 9. STOCK MOVEMENTS POLICIES
drop policy if exists "stock_movements_select_policy" on stock_movements;
create policy "stock_movements_select_policy"
  on stock_movements
  for select
  to authenticated
  using (is_active_user());

-- 10. ALERTS LOG POLICIES
drop policy if exists "alerts_log_select_policy" on alerts_log;
create policy "alerts_log_select_policy"
  on alerts_log
  for select
  to authenticated
  using (is_active_user());
