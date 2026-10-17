-- =====================================================================
-- PharmaTrack: Migration 002 - Stored Procedures & Business Logic
-- =====================================================================

-- Helper: Get near expiry window in days from app_settings
create or replace function get_near_expiry_days()
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_days integer;
begin
  select nullif(value, '')::integer
  into v_days
  from public.app_settings
  where key = 'near_expiry_days';

  return coalesce(v_days, 60);
exception when others then
  return 60;
end;
$$;

-- A) CREATE PURCHASE TRANSACTION
create or replace function create_purchase(
  p_supplier_id uuid,
  p_invoice_number text,
  p_purchase_date date,
  p_notes text,
  p_items jsonb,
  p_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase_id uuid;
  v_item jsonb;
  v_medicine_id uuid;
  v_batch_number text;
  v_quantity integer;
  v_unit_cost numeric(10,2);
  v_expiry_date date;
  v_manufacture_date date;
  v_batch_id uuid;
  v_batch_current_qty integer;
  v_batch_expiry date;
  v_total_cost numeric(12,2) := 0;
  v_med_active boolean;
  v_med_name text;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'INVALID_ITEMS: Purchase must contain at least one item.';
  end if;

  v_purchase_id := gen_random_uuid();

  insert into public.purchases (
    id,
    supplier_id,
    invoice_number,
    purchase_date,
    total_cost,
    notes,
    created_by
  )
  values (
    v_purchase_id,
    p_supplier_id,
    p_invoice_number,
    coalesce(p_purchase_date, app_today()),
    0,
    p_notes,
    p_user_id
  );

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_medicine_id := (v_item->>'medicine_id')::uuid;
    v_batch_number := trim(v_item->>'batch_number');
    v_quantity := (v_item->>'quantity')::integer;
    v_unit_cost := (v_item->>'unit_cost')::numeric;
    v_expiry_date := (v_item->>'expiry_date')::date;
    v_manufacture_date := case
      when v_item->>'manufacture_date' is not null and v_item->>'manufacture_date' <> ''
      then (v_item->>'manufacture_date')::date
      else null
    end;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'INVALID_QUANTITY: Item quantity must be greater than 0.';
    end if;

    if v_unit_cost is null or v_unit_cost < 0 then
      raise exception 'INVALID_COST: Unit cost cannot be negative.';
    end if;

    if v_expiry_date is null or v_expiry_date <= app_today() then
      raise exception 'INVALID_EXPIRY: Expiry date must be in the future (greater than today: %).', app_today();
    end if;

    -- Validate medicine existence and active status
    select is_active, name into v_med_active, v_med_name
    from public.medicines
    where id = v_medicine_id;

    if not found then
      raise exception 'MEDICINE_NOT_FOUND: Medicine with ID % does not exist.', v_medicine_id;
    end if;

    if not v_med_active then
      raise exception 'MEDICINE_INACTIVE: Medicine "%" is inactive and cannot receive new stock.', v_med_name;
    end if;

    -- Check if batch already exists for this medicine
    select id, quantity, expiry_date
    into v_batch_id, v_batch_current_qty, v_batch_expiry
    from public.batches
    where medicine_id = v_medicine_id and batch_number = v_batch_number
    for update;

    if found then
      if v_batch_expiry <> v_expiry_date then
        raise exception 'BATCH_EXPIRY_MISMATCH: Batch "%" already exists with expiry date %, which does not match entered expiry date %.',
          v_batch_number, v_batch_expiry, v_expiry_date;
      end if;

      update public.batches
      set
        quantity = quantity + v_quantity,
        initial_quantity = initial_quantity + v_quantity,
        purchase_price = coalesce(v_unit_cost, purchase_price),
        supplier_id = coalesce(p_supplier_id, supplier_id),
        updated_at = now()
      where id = v_batch_id;

      v_batch_current_qty := v_batch_current_qty + v_quantity;
    else
      v_batch_id := gen_random_uuid();
      v_batch_current_qty := v_quantity;

      insert into public.batches (
        id,
        medicine_id,
        supplier_id,
        batch_number,
        quantity,
        initial_quantity,
        purchase_price,
        manufacture_date,
        expiry_date,
        received_date
      )
      values (
        v_batch_id,
        v_medicine_id,
        p_supplier_id,
        v_batch_number,
        v_quantity,
        v_quantity,
        v_unit_cost,
        v_manufacture_date,
        v_expiry_date,
        coalesce(p_purchase_date, app_today())
      );
    end if;

    -- Insert purchase_items record
    insert into public.purchase_items (
      purchase_id,
      medicine_id,
      batch_id,
      batch_number,
      quantity,
      unit_cost,
      expiry_date
    )
    values (
      v_purchase_id,
      v_medicine_id,
      v_batch_id,
      v_batch_number,
      v_quantity,
      v_unit_cost,
      v_expiry_date
    );

    -- Insert stock_movements IN/PURCHASE
    insert into public.stock_movements (
      medicine_id,
      batch_id,
      movement_type,
      reason,
      quantity,
      batch_balance_after,
      reference_id,
      notes,
      performed_by
    )
    values (
      v_medicine_id,
      v_batch_id,
      'IN',
      'PURCHASE',
      v_quantity,
      v_batch_current_qty,
      v_purchase_id,
      coalesce(p_notes, 'Purchase invoice ' || coalesce(p_invoice_number, 'N/A')),
      p_user_id
    );

    v_total_cost := v_total_cost + (v_quantity * v_unit_cost);
  end loop;

  update public.purchases
  set total_cost = v_total_cost
  where id = v_purchase_id;

  return v_purchase_id;
end;
$$;

-- B) DISPENSE STOCK WITH FEFO (First Expire, First Out)
create or replace function dispense_stock(
  p_medicine_id uuid,
  p_quantity integer,
  p_reason text,
  p_notes text,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_medicine_name text;
  v_medicine_strength text;
  v_total_available integer := 0;
  v_remaining_to_dispense integer;
  v_take integer;
  v_batch_record record;
  v_allocations jsonb := '[]'::jsonb;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'INVALID_QUANTITY: Dispense quantity must be greater than 0.';
  end if;

  if p_reason not in ('SALE', 'DISPENSE', 'DAMAGED') then
    raise exception 'INVALID_REASON: Reason must be one of SALE, DISPENSE, or DAMAGED.';
  end if;

  select name, strength into v_medicine_name, v_medicine_strength
  from public.medicines
  where id = p_medicine_id;

  if not found then
    raise exception 'MEDICINE_NOT_FOUND: Medicine not found.';
  end if;

  -- Lock all eligible batches (non-expired, quantity > 0) in FEFO order
  select coalesce(sum(quantity), 0)
  into v_total_available
  from public.batches
  where medicine_id = p_medicine_id
    and quantity > 0
    and expiry_date >= app_today();

  if v_total_available < p_quantity then
    raise exception 'INSUFFICIENT_STOCK: Only % units of % % are available (requested %).',
      v_total_available, v_medicine_name, v_medicine_strength, p_quantity;
  end if;

  v_remaining_to_dispense := p_quantity;

  for v_batch_record in
    select id, batch_number, quantity, expiry_date
    from public.batches
    where medicine_id = p_medicine_id
      and quantity > 0
      and expiry_date >= app_today()
    order by expiry_date asc, received_date asc, created_at asc, id asc
    for update
  loop
    exit when v_remaining_to_dispense <= 0;

    v_take := least(v_batch_record.quantity, v_remaining_to_dispense);

    update public.batches
    set
      quantity = quantity - v_take,
      updated_at = now()
    where id = v_batch_record.id;

    insert into public.stock_movements (
      medicine_id,
      batch_id,
      movement_type,
      reason,
      quantity,
      batch_balance_after,
      notes,
      performed_by
    )
    values (
      p_medicine_id,
      v_batch_record.id,
      'OUT',
      p_reason,
      v_take,
      v_batch_record.quantity - v_take,
      p_notes,
      p_user_id
    );

    v_allocations := v_allocations || jsonb_build_object(
      'batch_id', v_batch_record.id,
      'batch_number', v_batch_record.batch_number,
      'expiry_date', v_batch_record.expiry_date,
      'taken', v_take,
      'remaining_in_batch', v_batch_record.quantity - v_take
    );

    v_remaining_to_dispense := v_remaining_to_dispense - v_take;
  end loop;

  return jsonb_build_object(
    'medicine_id', p_medicine_id,
    'medicine_name', v_medicine_name,
    'requested', p_quantity,
    'dispensed', p_quantity,
    'reason', p_reason,
    'batches', v_allocations
  );
end;
$$;

-- C) WRITE OFF EXPIRED BATCH
create or replace function write_off_expired(
  p_batch_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch record;
  v_written_off integer;
begin
  select id, medicine_id, batch_number, quantity, expiry_date
  into v_batch
  from public.batches
  where id = p_batch_id
  for update;

  if not found then
    raise exception 'BATCH_NOT_FOUND: Batch not found.';
  end if;

  if v_batch.expiry_date >= app_today() then
    raise exception 'NOT_EXPIRED: Cannot write off a batch that is not expired (expiry date: %, today: %).',
      v_batch.expiry_date, app_today();
  end if;

  if v_batch.quantity <= 0 then
    raise exception 'NOTHING_TO_WRITE_OFF: This batch has 0 quantity available to write off.';
  end if;

  v_written_off := v_batch.quantity;

  update public.batches
  set
    quantity = 0,
    updated_at = now()
  where id = p_batch_id;

  insert into public.stock_movements (
    medicine_id,
    batch_id,
    movement_type,
    reason,
    quantity,
    batch_balance_after,
    notes,
    performed_by
  )
  values (
    v_batch.medicine_id,
    v_batch.id,
    'OUT',
    'EXPIRED',
    v_written_off,
    0,
    'Expired stock written off',
    p_user_id
  );

  return jsonb_build_object(
    'batch_id', p_batch_id,
    'batch_number', v_batch.batch_number,
    'medicine_id', v_batch.medicine_id,
    'written_off_quantity', v_written_off
  );
end;
$$;

-- D) ADJUST STOCK QUANTITY (AUDITED)
create or replace function adjust_stock(
  p_batch_id uuid,
  p_new_quantity integer,
  p_notes text,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch record;
  v_diff integer;
  v_movement_type text;
begin
  if p_new_quantity is null or p_new_quantity < 0 then
    raise exception 'INVALID_QUANTITY: New quantity cannot be negative.';
  end if;

  if p_notes is null or length(trim(p_notes)) = 0 then
    raise exception 'REASON_REQUIRED: A valid explanation note is mandatory for stock adjustments.';
  end if;

  select id, medicine_id, batch_number, quantity
  into v_batch
  from public.batches
  where id = p_batch_id
  for update;

  if not found then
    raise exception 'BATCH_NOT_FOUND: Batch not found.';
  end if;

  if v_batch.quantity = p_new_quantity then
    raise exception 'NO_CHANGE: The new quantity is identical to current quantity (%).', v_batch.quantity;
  end if;

  v_diff := abs(p_new_quantity - v_batch.quantity);

  if p_new_quantity > v_batch.quantity then
    v_movement_type := 'IN';
  else
    v_movement_type := 'OUT';
  end if;

  update public.batches
  set
    quantity = p_new_quantity,
    updated_at = now()
  where id = p_batch_id;

  insert into public.stock_movements (
    medicine_id,
    batch_id,
    movement_type,
    reason,
    quantity,
    batch_balance_after,
    notes,
    performed_by
  )
  values (
    v_batch.medicine_id,
    v_batch.id,
    v_movement_type,
    'ADJUSTMENT',
    v_diff,
    p_new_quantity,
    trim(p_notes),
    p_user_id
  );

  return jsonb_build_object(
    'batch_id', p_batch_id,
    'batch_number', v_batch.batch_number,
    'medicine_id', v_batch.medicine_id,
    'old_quantity', v_batch.quantity,
    'new_quantity', p_new_quantity,
    'difference', v_diff,
    'movement_type', v_movement_type
  );
end;
$$;

-- Permissions on business functions
revoke execute on function create_purchase(uuid, text, date, text, jsonb, uuid) from public, anon, authenticated;
grant execute on function create_purchase(uuid, text, date, text, jsonb, uuid) to service_role;

revoke execute on function dispense_stock(uuid, integer, text, text, uuid) from public, anon, authenticated;
grant execute on function dispense_stock(uuid, integer, text, text, uuid) to service_role;

revoke execute on function write_off_expired(uuid, uuid) from public, anon, authenticated;
grant execute on function write_off_expired(uuid, uuid) to service_role;

revoke execute on function adjust_stock(uuid, integer, text, uuid) from public, anon, authenticated;
grant execute on function adjust_stock(uuid, integer, text, uuid) to service_role;
