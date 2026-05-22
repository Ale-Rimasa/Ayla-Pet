-- ============================================================
-- 021_create_order_add_user_id.sql
-- Agrega p_user_id a create_order para soportar cuentas de cliente.
-- Migration 018 agregó la columna user_id a orders pero no actualizó la RPC.
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_order(
  p_customer_name        text,
  p_customer_email       text,
  p_customer_phone       text,
  p_shipping_street      text,
  p_shipping_city        text,
  p_shipping_province    text,
  p_shipping_postal_code text,
  p_subtotal             integer,
  p_shipping_cost        integer,
  p_total                integer,
  p_notes                text DEFAULT NULL,
  p_items                jsonb DEFAULT '[]'::jsonb,
  p_user_id              uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_item     jsonb;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Insufficient privilege' USING ERRCODE = '42501';
  END IF;

  IF p_total <> p_subtotal + p_shipping_cost THEN
    RAISE EXCEPTION 'Invalid total: total must equal subtotal + shipping_cost' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Invalid items: must be a non-empty JSON array' USING ERRCODE = '22023';
  END IF;

  INSERT INTO orders (
    user_id,
    customer_name, customer_email, customer_phone,
    shipping_street, shipping_city, shipping_province, shipping_postal_code,
    subtotal, shipping_cost, total,
    notes, status
  ) VALUES (
    p_user_id,
    p_customer_name, p_customer_email, p_customer_phone,
    p_shipping_street, p_shipping_city, p_shipping_province, p_shipping_postal_code,
    p_subtotal, p_shipping_cost, p_total,
    p_notes, 'pending'
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO order_items (
      order_id, variant_id,
      product_name, variant_name,
      unit_price, quantity, subtotal,
      image_url
    ) VALUES (
      v_order_id,
      NULLIF((v_item->>'variant_id')::text, '')::uuid,
      v_item->>'product_name',
      v_item->>'variant_name',
      (v_item->>'unit_price')::integer,
      (v_item->>'quantity')::integer,
      (v_item->>'subtotal')::integer,
      v_item->>'image_url'
    );
  END LOOP;

  INSERT INTO order_status_history (order_id, from_status, to_status, actor_id)
  VALUES (v_order_id, NULL, 'pending', NULL);

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_order(text, text, text, text, text, text, text, integer, integer, integer, text, jsonb, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order(text, text, text, text, text, text, text, integer, integer, integer, text, jsonb, uuid) TO service_role;
