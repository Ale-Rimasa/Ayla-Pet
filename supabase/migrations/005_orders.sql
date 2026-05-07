-- ============================================================
-- 005_orders.sql
-- Guest-only orders (no user_id), status enum, RLS
-- All totals in centavos ARS (integer, no float)
-- ============================================================

CREATE TYPE order_status AS ENUM (
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded'
);

CREATE TABLE orders (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  status           order_status  NOT NULL DEFAULT 'pending',

  -- Customer snapshot (no FK — guest checkout, no auth.users dependency)
  customer_name        text      NOT NULL,
  customer_email       text      NOT NULL,
  customer_phone       text      NOT NULL,

  -- Shipping snapshot
  shipping_street       text     NOT NULL,
  shipping_city         text     NOT NULL,
  shipping_province     text     NOT NULL,
  shipping_postal_code  text     NOT NULL,

  -- Totals in centavos ARS
  subtotal         integer       NOT NULL CHECK (subtotal >= 0),
  shipping_cost    integer       NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
  total            integer       NOT NULL CHECK (total >= 0),

  -- MercadoPago references (set after preference/payment created)
  mp_preference_id text,
  mp_payment_id    text,

  notes            text,
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX orders_status_idx          ON orders (status);
CREATE INDEX orders_customer_email_idx  ON orders (customer_email);
CREATE INDEX orders_created_at_idx      ON orders (created_at DESC);

-- Sparse index: only for rows that already have a payment ID (webhook lookups)
CREATE INDEX orders_mp_payment_id_idx
  ON orders (mp_payment_id)
  WHERE mp_payment_id IS NOT NULL;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Only service_role can create orders (from /api/orders route handler)
CREATE POLICY "orders: service role insert"
  ON orders FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Only service_role can update orders (webhook + /api/* handlers)
CREATE POLICY "orders: service role update"
  ON orders FOR UPDATE
  USING  (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Admin can SELECT all orders (admin panel)
CREATE POLICY "orders: admin select"
  ON orders FOR SELECT
  USING (is_admin(auth.uid()));

-- Admin can also update orders (manual status changes from /admin/pedidos)
CREATE POLICY "orders: admin update"
  ON orders FOR UPDATE
  USING  (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- No DELETE: orders are never physically deleted
