-- =====================================================================
-- PharmaTrack: Migration 003 - Views
-- =====================================================================

-- 1. BATCH STATUS VIEW
create or replace view v_batch_status
with (security_invoker = true)
as
select
  b.id,
  b.medicine_id,
  b.supplier_id,
  b.batch_number,
  b.quantity,
  b.initial_quantity,
  b.purchase_price,
  b.manufacture_date,
  b.expiry_date,
  b.received_date,
  b.created_at,
  b.updated_at,
  m.name as medicine_name,
  m.strength,
  m.dosage_form,
  s.name as supplier_name,
  (b.expiry_date - app_today()) as days_to_expiry,
  case
    when b.expiry_date < app_today() then 'EXPIRED'
    when (b.expiry_date - app_today()) <= get_near_expiry_days() then 'NEAR_EXPIRY'
    else 'SAFE'
  end as expiry_status
from public.batches b
join public.medicines m on b.medicine_id = m.id
left join public.suppliers s on b.supplier_id = s.id;

-- 2. MEDICINE STOCK VIEW
create or replace view v_medicine_stock
with (security_invoker = true)
as
with batch_metrics as (
  select
    b.medicine_id,
    -- Sellable: non-expired batches
    coalesce(sum(case when b.expiry_date >= app_today() then b.quantity else 0 end), 0) as sellable_quantity,
    -- Expired: expired batches
    coalesce(sum(case when b.expiry_date < app_today() then b.quantity else 0 end), 0) as expired_quantity,
    -- Total quantity across all batches
    coalesce(sum(b.quantity), 0) as total_quantity_all,
    -- Earliest non-expired expiry date with stock > 0
    min(case when b.expiry_date >= app_today() and b.quantity > 0 then b.expiry_date else null end) as earliest_sellable_expiry,
    -- Earliest expired expiry date with stock > 0 (fallback)
    min(case when b.expiry_date < app_today() and b.quantity > 0 then b.expiry_date else null end) as earliest_expired_expiry,
    -- Has near expiry
    bool_or(
      b.quantity > 0
      and b.expiry_date >= app_today()
      and (b.expiry_date - app_today()) <= get_near_expiry_days()
    ) as has_near_expiry,
    -- Has expired with stock
    bool_or(
      b.quantity > 0
      and b.expiry_date < app_today()
    ) as has_expired,
    -- Stock valuation for sellable batches
    coalesce(sum(case when b.expiry_date >= app_today() then b.quantity * coalesce(b.purchase_price, 0) else 0 end), 0) as stock_value
  from public.batches b
  group by b.medicine_id
)
select
  m.id,
  m.name,
  m.generic_name,
  m.category_id,
  m.strength,
  m.dosage_form,
  m.unit_price,
  m.reorder_level,
  m.default_supplier_id,
  m.description,
  m.is_active,
  m.created_at,
  m.updated_at,
  c.name as category_name,
  s.name as supplier_name,
  coalesce(bm.sellable_quantity, 0)::integer as sellable_quantity,
  coalesce(bm.expired_quantity, 0)::integer as expired_quantity,
  coalesce(bm.total_quantity_all, 0)::integer as total_quantity_all,
  coalesce(bm.earliest_sellable_expiry, bm.earliest_expired_expiry) as earliest_expiry,
  (coalesce(bm.sellable_quantity, 0) <= m.reorder_level) as is_low_stock,
  coalesce(bm.has_near_expiry, false) as has_near_expiry,
  coalesce(bm.has_expired, false) as has_expired,
  coalesce(bm.stock_value, 0)::numeric(12,2) as stock_value,
  -- Exact status priority from section 4:
  case
    when coalesce(bm.total_quantity_all, 0) = 0 then 'OUT_OF_STOCK'
    when coalesce(bm.sellable_quantity, 0) = 0 and coalesce(bm.expired_quantity, 0) > 0 then 'EXPIRED'
    when coalesce(bm.sellable_quantity, 0) <= m.reorder_level then 'LOW_STOCK'
    when coalesce(bm.has_near_expiry, false) = true then 'NEAR_EXPIRY'
    else 'AVAILABLE'
  end as stock_status
from public.medicines m
left join public.categories c on m.category_id = c.id
left join public.suppliers s on m.default_supplier_id = s.id
left join batch_metrics bm on m.id = bm.medicine_id;

-- 3. DASHBOARD SUMMARY VIEW
create or replace view v_dashboard_summary
with (security_invoker = true)
as
select
  coalesce(sum(case when is_active then sellable_quantity else 0 end), 0)::bigint as total_stock_units,
  count(*) filter (where is_active and (is_low_stock or stock_status = 'OUT_OF_STOCK'))::integer as low_stock_count,
  count(*) filter (where is_active and has_near_expiry)::integer as near_expiry_count,
  (
    select count(*)::integer
    from public.batches b
    join public.medicines m on b.medicine_id = m.id
    where m.is_active and b.quantity > 0 and b.expiry_date < app_today()
  ) as expired_count,
  count(*) filter (where is_active)::integer as total_medicines,
  coalesce(sum(case when is_active then stock_value else 0 end), 0)::numeric(14,2) as total_stock_value
from public.v_medicine_stock;
