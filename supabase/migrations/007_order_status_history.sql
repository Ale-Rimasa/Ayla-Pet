-- ============================================================
-- 007_order_status_history.sql
-- Registro inmutable de cambios de estado de órdenes
-- ============================================================

CREATE TABLE order_status_history (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status  order_status,          -- NULL = creación inicial
  to_status    order_status NOT NULL,
  actor_id     uuid         REFERENCES auth.users(id) ON DELETE SET NULL,
  notes        text,
  created_at   timestamptz  NOT NULL DEFAULT now()
);

-- Sin updated_at — este registro es inmutable por diseño
CREATE INDEX order_status_history_order_id_idx   ON order_status_history (order_id);
CREATE INDEX order_status_history_created_at_idx ON order_status_history (created_at DESC);

ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- Solo service_role o admin pueden insertar entradas de historial
CREATE POLICY "order_status_history: service role insert"
  ON order_status_history FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "order_status_history: admin insert"
  ON order_status_history FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "order_status_history: service role select"
  ON order_status_history FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "order_status_history: admin select"
  ON order_status_history FOR SELECT
  USING (is_admin(auth.uid()));

-- Sin políticas de UPDATE ni DELETE — inmutabilidad por diseño
