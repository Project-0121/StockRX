-- =====================================================================
-- PharmaTrack: Migration 001 - Core Schema & Tables
-- =====================================================================

-- Ensure pgcrypto extension is available for UUID generation
create extension if not exists "pgcrypto";

-- Helper function to return today's date in Asia/Kolkata timezone
create or replace function app_today()
returns date
language sql
stable
as $$
  select (now() at time zone 'Asia/Kolkata')::date;
$$;

-- Trigger function for updated_at timestamps
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1. APP SETTINGS
create table if not exists app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

drop trigger if exists trigger_app_settings_updated_at on app_settings;
create trigger trigger_app_settings_updated_at
  before update on app_settings
  for each row execute function set_updated_at();

insert into app_settings (key, value)
values
  ('pharmacy_name', 'PharmaTrack Pharmacy'),
  ('near_expiry_days', '60'),
  ('default_reorder_level', '20')
on conflict (key) do nothing;

-- 2. PROFILES
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  role text not null default 'staff' check (role in ('admin', 'staff')),
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists trigger_profiles_updated_at on profiles;
create trigger trigger_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- Trigger on auth.users after insert
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
begin
  v_full_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1),
    'Staff Member'
  );

  insert into public.profiles (id, full_name, email, role, is_active)
  values (new.id, v_full_name, new.email, 'staff', true)
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 3. CATEGORIES
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

insert into categories (name)
values
  ('Antibiotic'),
  ('Analgesic'),
  ('Vitamin and Supplement'),
  ('Antacid'),
  ('Cough and Cold'),
  ('Antidiabetic'),
  ('Antihypertensive'),
  ('Antihistamine'),
  ('First Aid'),
  ('Other')
on conflict (name) do nothing;

-- 4. SUPPLIERS
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  contact_person text,
  phone text,
  email text,
  address text,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists trigger_suppliers_updated_at on suppliers;
create trigger trigger_suppliers_updated_at
  before update on suppliers
  for each row execute function set_updated_at();

-- 5. MEDICINES
create table if not exists medicines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  generic_name text,
  category_id uuid references categories(id) on delete set null,
  strength text not null default '',
  dosage_form text not null default 'Tablet' check (dosage_form in ('Tablet','Capsule','Syrup','Injection','Ointment','Drops','Powder','Other')),
  unit_price numeric(10,2) not null default 0 check (unit_price >= 0),
  reorder_level integer not null default 20 check (reorder_level >= 0),
  default_supplier_id uuid references suppliers(id) on delete set null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint uq_medicine_name_strength_form unique (name, strength, dosage_form)
);

drop trigger if exists trigger_medicines_updated_at on medicines;
create trigger trigger_medicines_updated_at
  before update on medicines
  for each row execute function set_updated_at();

-- 6. BATCHES
create table if not exists batches (
  id uuid primary key default gen_random_uuid(),
  medicine_id uuid not null references medicines(id) on delete restrict,
  supplier_id uuid references suppliers(id) on delete set null,
  batch_number text not null,
  quantity integer not null check (quantity >= 0),
  initial_quantity integer not null check (initial_quantity >= 0),
  purchase_price numeric(10,2) check (purchase_price is null or purchase_price >= 0),
  manufacture_date date,
  expiry_date date not null,
  received_date date not null default (app_today()),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint uq_batch_medicine_batch_number unique (medicine_id, batch_number)
);

create index if not exists idx_batches_medicine_expiry on batches (medicine_id, expiry_date);
create index if not exists idx_batches_expiry on batches (expiry_date);

drop trigger if exists trigger_batches_updated_at on batches;
create trigger trigger_batches_updated_at
  before update on batches
  for each row execute function set_updated_at();

-- 7. PURCHASES
create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references suppliers(id) on delete set null,
  invoice_number text,
  purchase_date date not null default (app_today()),
  total_cost numeric(12,2) not null default 0 check (total_cost >= 0),
  notes text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_purchases_date on purchases (purchase_date desc);

-- 8. PURCHASE ITEMS
create table if not exists purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references purchases(id) on delete cascade,
  medicine_id uuid not null references medicines(id) on delete restrict,
  batch_id uuid references batches(id) on delete set null,
  batch_number text not null,
  quantity integer not null check (quantity > 0),
  unit_cost numeric(10,2) not null check (unit_cost >= 0),
  expiry_date date not null
);

create index if not exists idx_purchase_items_purchase on purchase_items (purchase_id);

-- 9. STOCK MOVEMENTS (IMMUTABLE AUDIT LEDGER)
create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  medicine_id uuid not null references medicines(id) on delete restrict,
  batch_id uuid not null references batches(id) on delete restrict,
  movement_type text not null check (movement_type in ('IN', 'OUT')),
  reason text not null check (reason in ('PURCHASE', 'SALE', 'DISPENSE', 'DAMAGED', 'EXPIRED', 'ADJUSTMENT')),
  quantity integer not null check (quantity > 0),
  batch_balance_after integer not null check (batch_balance_after >= 0),
  reference_id uuid null,
  notes text,
  performed_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_movements_medicine_created on stock_movements (medicine_id, created_at desc);
create index if not exists idx_movements_created on stock_movements (created_at desc);

-- Immutability guard trigger: updates and deletes are strictly prohibited
create or replace function prevent_stock_movement_modification()
returns trigger
language plpgsql
as $$
begin
  raise exception 'STOCK_MOVEMENTS_IMMUTABLE: Stock movements audit ledger records cannot be modified or deleted.';
end;
$$;

drop trigger if exists trigger_prevent_stock_movement_modification on stock_movements;
create trigger trigger_prevent_stock_movement_modification
  before update or delete on stock_movements
  for each row execute function prevent_stock_movement_modification();

-- 10. ALERTS LOG
create table if not exists alerts_log (
  id uuid primary key default gen_random_uuid(),
  run_date date not null,
  low_stock_count integer not null default 0,
  near_expiry_count integer not null default 0,
  expired_count integer not null default 0,
  created_at timestamptz default now()
);

create index if not exists idx_alerts_log_run_date on alerts_log (run_date desc);
