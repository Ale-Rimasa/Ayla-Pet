-- ============================================================
-- 029_create_order_add_engraving_text.sql
-- Adds optional engraving_text column to orders table and
-- updates create_order RPC to accept and persist it atomically.
-- Additive + nullable — no backfill needed, no breaking change.
-- Existing orders will have engraving_text = NULL.
-- ============================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS engraving_text text
  CHECK (engraving_text IS NULL OR char_length(engraving_text) <= 20);

-- ── Update create_order RPC ──────────────────────────────────
-- p_engraving_text is appended as last param (DEFAULT NULL)
-- so all existing callers remain valid without changes.

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
  p_user_id              uuid DEFAULT NULL,
  p_shipping_packages    jsonb DEFAULT '[]'::jsonb,
  p_engraving_text       text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_item     jsonb;
  v_pkg      jsonb;
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

  -- ── Insertar orden ───────────────────────────────────────
  INSERT INTO orders (
    user_id,
    customer_name, customer_email, customer_phone,
    shipping_street, shipping_city, shipping_province, shipping_postal_code,
    subtotal, shipping_cost, total,
    notes, status,
    engraving_text
  ) VALUES (
    p_user_id,
    p_customer_name, p_customer_email, p_customer_phone,
    p_shipping_street, p_shipping_city, p_shipping_province, p_shipping_postal_code,
    p_subtotal, p_shipping_cost, p_total,
    p_notes, 'pending',
    p_engraving_text
  )
  RETURNING id INTO v_order_id;

  -- ── Insertar items ───────────────────────────────────────
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

  -- ── Insertar snapshot de bultos ──────────────────────────
  -- Vacío es válido (pickup sin Andreani).
  FOR v_pkg IN SELECT * FROM jsonb_array_elements(p_shipping_packages)
  LOOP
    INSERT INTO order_shipping_packages (
      order_id,
      package_profile_id,
      bulto_index,
      weight_g,
      height_mm,
      width_mm,
      length_mm
    ) VALUES (
      v_order_id,
      v_pkg->>'package_profile_id',
      (v_pkg->>'bulto_index')::integer,
      (v_pkg->>'weight_g')::integer,
      (v_pkg->>'height_mm')::integer,
      (v_pkg->>'width_mm')::integer,
      (v_pkg->>'length_mm')::integer
    );
  END LOOP;

  -- ── Historial inicial ────────────────────────────────────
  INSERT INTO order_status_history (order_id, from_status, to_status, actor_id)
  VALUES (v_order_id, NULL, 'pending', NULL);

  RETURN v_order_id;
END;
$$;

-- Revoke from previous signature (026) and grant updated signature
REVOKE ALL ON FUNCTION public.create_order(text, text, text, text, text, text, text, integer, integer, integer, text, jsonb, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_order(text, text, text, text, text, text, text, integer, integer, integer, text, jsonb, uuid, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order(text, text, text, text, text, text, text, integer, integer, integer, text, jsonb, uuid, jsonb, text) TO service_role;
