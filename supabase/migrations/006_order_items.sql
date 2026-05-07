-- ============================================================
-- 006_order_items.sql
-- Immutable snapshot of each line item at purchase time
-- variant_id is nullable: ON DELETE SET NULL preserves order history
-- when a product variant is later deleted
-- ============================================================

CREATE TABLE order_items (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid    NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Nullable FK: if variant is deleted, historical item is preserved
  variant_id    uuid    REFERENCES product_variants(id) ON DELETE SET NULL,

  -- Snapshot columns: NOT NULL — these are the source of truth for the order
  product_name  text    NOT NULL,
  variant_name  text    NOT NULL,
  unit_price    integer NOT NULL CHECK (unit_price >= 0),  -- centavos ARS
  quantity      integer NOT NULL CHECK (quantity > 0),
  subtotal      integer NOT NULL CHECK (subtotal >= 0),    -- unit_price * quantity

  image_url     text,   -- snapshot of product image at time of purchase

  created_at    timestamptz NOT NULL DEFAULT now()
  -- No updated_at: order_items are immutable after creation
);

CREATE INDEX order_items_order_id_idx ON order_items (order_id);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Only service_role inserts items (created atomically with the order in /api/orders)
CREATE POLICY "order_items: service role insert"
  ON order_items FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Service_role needs SELECT for webhook processing (stock decrement, email data)
CREATE POLICY "order_items: service role select"
  ON order_items FOR SELECT
  USING (auth.role() = 'service_role');

-- Admin can SELECT for /admin/pedidos detail view
CREATE POLICY "order_items: admin select"
  ON order_items FOR SELECT
  USING (is_admin(auth.uid()));

-- No UPDATE or DELETE: order_items are immutable historical records
