-- ============================================================
-- 008_payments.sql
-- Registro de pagos con idempotencia via mp_payment_id UNIQUE
-- ============================================================

CREATE TABLE payments (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            uuid        NOT NULL REFERENCES orders(id),
  mp_payment_id       text        NOT NULL UNIQUE,  -- clave de idempotencia
  mp_preference_id    text,
  status              text        NOT NULL,          -- approved, rejected, pending, etc.
  status_detail       text,
  payment_method_id   text,
  payment_type_id     text,
  amount              integer     NOT NULL CHECK (amount >= 0),
  currency_id         text        NOT NULL DEFAULT 'ARS',
  raw_data            jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payments_order_id_idx ON payments (order_id);

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Solo service_role puede operar sobre payments
-- (nunca expuesto directamente al cliente ni al admin desde el browser)
CREATE POLICY "payments: service role insert"
  ON payments FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "payments: service role select"
  ON payments FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "payments: service role update"
  ON payments FOR UPDATE
  USING  (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
