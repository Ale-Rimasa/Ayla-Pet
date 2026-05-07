-- ============================================================
-- 011_decrement_stock_rpc.sql
-- Atomic stock decrement via SQL expression (stock = stock - qty)
-- Supabase JS client does not support raw column expressions in .update()
-- ============================================================

CREATE OR REPLACE FUNCTION decrement_stock(p_variant_id uuid, p_qty integer)
RETURNS SETOF product_variants
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE product_variants
  SET stock = stock - p_qty
  WHERE id = p_variant_id
    AND stock >= p_qty
  RETURNING *;
$$;

REVOKE ALL ON FUNCTION decrement_stock(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decrement_stock(uuid, integer) TO service_role;
