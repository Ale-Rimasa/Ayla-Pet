-- ============================================================
-- 025_order_shipping_packages.sql
-- Snapshot inmutable de los bultos usados al crear una orden.
-- package_profile_id es texto sin FK intencional: si el perfil
-- se elimina o cambia, los datos históricos quedan intactos.
-- El owner del pedido puede ver sus propios bultos.
-- ============================================================

CREATE TABLE order_shipping_packages (
  id                 uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id           uuid    NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  package_profile_id text    NOT NULL,   -- snapshot, sin FK intencional
  bulto_index        integer NOT NULL CHECK (bulto_index >= 1),
  weight_g           integer NOT NULL CHECK (weight_g  > 0),
  height_mm          integer NOT NULL CHECK (height_mm > 0),
  width_mm           integer NOT NULL CHECK (width_mm  > 0),
  length_mm          integer NOT NULL CHECK (length_mm > 0),
  created_at         timestamptz NOT NULL DEFAULT now(),

  UNIQUE (order_id, bulto_index)
);

CREATE INDEX osp_order_id_idx ON order_shipping_packages (order_id);

ALTER TABLE order_shipping_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_shipping_packages: admin all"
  ON order_shipping_packages FOR ALL
  USING (is_admin(auth.uid()));

-- El dueño del pedido puede ver sus propios bultos (para historial de cuenta)
CREATE POLICY "order_shipping_packages: owner select"
  ON order_shipping_packages FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders WHERE user_id = auth.uid()
    )
  );
