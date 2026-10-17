-- =====================================================================
-- PharmaTrack: Ledger Consistency Check
-- This query returns 0 rows if every batch balance exactly matches
-- the immutable stock_movements ledger.
-- =====================================================================

with movement_aggregates as (
  select
    batch_id,
    coalesce(sum(case when movement_type = 'IN' and reason = 'PURCHASE' then quantity else 0 end), 0) as total_purchased,
    coalesce(sum(case when movement_type = 'IN' and reason = 'ADJUSTMENT' then quantity else 0 end), 0) as total_adjusted_in,
    coalesce(sum(case when movement_type = 'OUT' then quantity else 0 end), 0) as total_outs
  from public.stock_movements
  group by batch_id
)
select
  b.id as batch_id,
  b.batch_number,
  m.name as medicine_name,
  b.initial_quantity,
  b.quantity as current_quantity,
  coalesce(ma.total_purchased, 0) as total_purchased,
  coalesce(ma.total_adjusted_in, 0) as total_adjusted_in,
  coalesce(ma.total_outs, 0) as total_outs,
  (b.initial_quantity + coalesce(ma.total_adjusted_in, 0) - coalesce(ma.total_outs, 0)) as calculated_quantity,
  (b.quantity - (b.initial_quantity + coalesce(ma.total_adjusted_in, 0) - coalesce(ma.total_outs, 0))) as discrepancy
from public.batches b
join public.medicines m on b.medicine_id = m.id
left join movement_aggregates ma on b.id = ma.batch_id
where b.quantity <> (b.initial_quantity + coalesce(ma.total_adjusted_in, 0) - coalesce(ma.total_outs, 0));
