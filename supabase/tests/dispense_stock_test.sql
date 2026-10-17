-- =====================================================================
-- PharmaTrack: SQL Unit Test - FEFO Dispense, Immutability & Constraints
-- Runs inside a transaction and automatically rolls back.
-- =====================================================================

begin;

do $$
declare
  v_supplier_id uuid;
  v_med_id uuid;
  v_batch_exp uuid;
  v_batch1 uuid;
  v_batch2 uuid;
  v_dispense_res jsonb;
  v_b1_qty int;
  v_b2_qty int;
  v_b_exp_qty int;
  v_failed boolean;
  v_err_msg text;
  v_mvt_id uuid;
begin
  raise notice 'Starting dispense_stock_test...';

  -- Setup test supplier and medicine
  insert into suppliers (name, contact_person)
  values ('Test Supplier Corp', 'Tester')
  returning id into v_supplier_id;

  insert into medicines (name, strength, dosage_form, unit_price, reorder_level)
  values ('TestParacetamol', '500mg', 'Tablet', 5.00, 20)
  returning id into v_med_id;

  -- 1. Insert batches:
  -- Expired batch: 50 units (should be SKIPPED by FEFO)
  insert into batches (medicine_id, supplier_id, batch_number, quantity, initial_quantity, expiry_date, received_date)
  values (v_med_id, v_supplier_id, 'TEST-EXPIRED', 50, 50, app_today() - interval '5 days', app_today() - interval '10 days')
  returning id into v_batch_exp;

  -- Batch 1: Expiry in 10 days, 40 units
  insert into batches (medicine_id, supplier_id, batch_number, quantity, initial_quantity, expiry_date, received_date)
  values (v_med_id, v_supplier_id, 'TEST-EARLY', 40, 40, app_today() + interval '10 days', app_today() - interval '2 days')
  returning id into v_batch1;

  -- Batch 2: Expiry in 30 days, 50 units
  insert into batches (medicine_id, supplier_id, batch_number, quantity, initial_quantity, expiry_date, received_date)
  values (v_med_id, v_supplier_id, 'TEST-LATER', 50, 50, app_today() + interval '30 days', app_today() - interval '1 days')
  returning id into v_batch2;

  -- (a) & (b) Multi-batch spill-over test: Dispense 70 units
  -- Should take 40 from TEST-EARLY (remaining 0) and 30 from TEST-LATER (remaining 20).
  -- TEST-EXPIRED should remain 50 (untouched).
  v_dispense_res := dispense_stock(v_med_id, 70, 'SALE', 'Test Sale 70', null);

  select quantity into v_b1_qty from batches where id = v_batch1;
  select quantity into v_b2_qty from batches where id = v_batch2;
  select quantity into v_b_exp_qty from batches where id = v_batch_exp;

  assert v_b1_qty = 0, 'FAIL: Batch 1 should have 0 units remaining';
  assert v_b2_qty = 20, 'FAIL: Batch 2 should have 20 units remaining';
  assert v_b_exp_qty = 50, 'FAIL: Expired batch should NOT have been touched!';
  raise notice 'PASSED: (a) FEFO order, (b) multi-batch spill-over, (d) expired batches skipped';

  -- (c) Insufficient stock test: Try to dispense 30 units (only 20 left in sellable batches)
  v_failed := false;
  begin
    perform dispense_stock(v_med_id, 30, 'SALE', 'Should Fail', null);
  exception when others then
    v_failed := true;
    v_err_msg := sqlerrm;
  end;

  assert v_failed = true, 'FAIL: Dispense 30 should have raised INSUFFICIENT_STOCK';
  assert v_err_msg like '%INSUFFICIENT_STOCK%', 'FAIL: Error message should contain INSUFFICIENT_STOCK';

  -- Verify no deduction occurred on failure
  select quantity into v_b2_qty from batches where id = v_batch2;
  assert v_b2_qty = 20, 'FAIL: Batch 2 quantity changed despite failure!';
  raise notice 'PASSED: (c) Insufficient stock raises exception and does not alter stock';

  -- (e) Stock never goes negative check
  assert v_b1_qty >= 0 and v_b2_qty >= 0 and v_b_exp_qty >= 0, 'FAIL: Stock went negative';
  raise notice 'PASSED: (e) Stock never goes negative';

  -- (f) Stock movements immutability check
  select id into v_mvt_id from stock_movements where medicine_id = v_med_id limit 1;
  assert v_mvt_id is not null, 'FAIL: No stock movement logged';

  v_failed := false;
  begin
    update stock_movements set quantity = 999 where id = v_mvt_id;
  exception when others then
    v_failed := true;
  end;
  assert v_failed = true, 'FAIL: Updating stock_movements should have thrown an exception';

  v_failed := false;
  begin
    delete from stock_movements where id = v_mvt_id;
  exception when others then
    v_failed := true;
  end;
  assert v_failed = true, 'FAIL: Deleting stock_movements should have thrown an exception';

  raise notice 'PASSED: (f) Stock movements immutability verified (UPDATE and DELETE prohibited)';
  raise notice 'ALL TESTS PASSED!';
end;
$$;

rollback;
