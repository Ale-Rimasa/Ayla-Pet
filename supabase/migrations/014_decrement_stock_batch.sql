-- ============================================================
-- 014_decrement_stock_batch.sql
-- Atomic batch stock decrement in a single transaction.
-- Uses SELECT FOR UPDATE to lock rows, checks all quantities,
-- then decrements all — any insufficient stock rolls back everything.
-- ============================================================

CREATE OR REPLACE FUNCTION decrement_stock_batch(p_items JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item  JSONB;
  v_stock INTEGER;
BEGIN
  -- Phase 1: lock rows and validate stock for all items
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT stock INTO v_stock
    FROM product_variants
    WHERE id = (item->>'variant_id')::UUID
      AND deleted_at IS NULL
    FOR UPDATE;

    IF v_stock IS NULL OR v_stock < (item->>'qty')::INTEGER THEN
      RAISE EXCEPTION 'insufficient_stock_for_variant:%', item->>'variant_id';
    END IF;
  END LOOP;

  -- Phase 2: all checks passed — decrement atomically
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    UPDATE product_variants
    SET stock = stock - (item->>'qty')::INTEGER
    WHERE id = (item->>'variant_id')::UUID;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION decrement_stock_batch(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decrement_stock_batch(JSONB) TO service_role;
