-- Fix: cast TEXT params to order_status enum explicitly.
-- Postgres does not auto-cast text to a custom enum type.
CREATE OR REPLACE FUNCTION update_order_status_atomic(
  p_order_id    UUID,
  p_from_status TEXT,
  p_new_status  TEXT,
  p_actor_id    UUID DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows_updated INTEGER;
BEGIN
  UPDATE orders
  SET    status     = p_new_status::order_status,
         updated_at = NOW()
  WHERE  id         = p_order_id
    AND  status     = p_from_status::order_status;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  IF v_rows_updated = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'concurrent_modification');
  END IF;

  INSERT INTO order_status_history (order_id, from_status, to_status, actor_id)
  VALUES (p_order_id, p_from_status::order_status, p_new_status::order_status, p_actor_id);

  RETURN jsonb_build_object('ok', true);
END;
$$;
