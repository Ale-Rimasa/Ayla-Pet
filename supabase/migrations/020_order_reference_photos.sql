-- ============================================================
-- 020_order_reference_photos.sql
-- Fotos de referencia que el cliente sube post-pago.
-- Acceso por capability token (orderId UUID v4).
-- ============================================================

-- 1. Tabla -----------------------------------------------------
CREATE TABLE order_reference_photos (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid        NOT NULL
                            REFERENCES orders(id) ON DELETE CASCADE,
  storage_path  text        NOT NULL,
  display_order smallint    NOT NULL DEFAULT 0,
  mime_type     text        NOT NULL,
  size_bytes    integer     NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT order_reference_photos_mime_type_chk
    CHECK (mime_type IN ('image/jpeg','image/png','image/webp','image/avif')),
  CONSTRAINT order_reference_photos_size_chk
    CHECK (size_bytes > 0 AND size_bytes <= 5242880),
  CONSTRAINT order_reference_photos_display_order_chk
    CHECK (display_order >= 0 AND display_order < 3),
  CONSTRAINT order_reference_photos_storage_path_unique
    UNIQUE (storage_path)
);

-- 2. Indices ---------------------------------------------------
CREATE INDEX order_reference_photos_order_id_idx
  ON order_reference_photos (order_id, display_order);

-- 3. Trigger limite 3 (BEFORE INSERT, atomico) -----------------
CREATE OR REPLACE FUNCTION check_order_photos_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  current_count integer;
BEGIN
  -- Lock fila de orders para serializar inserts concurrentes para
  -- el mismo order_id. Garantiza que dos inserts simultaneos no
  -- puedan ambos ver count = 2 y ambos insertar.
  PERFORM 1 FROM orders WHERE id = NEW.order_id FOR UPDATE;

  SELECT COUNT(*) INTO current_count
  FROM order_reference_photos
  WHERE order_id = NEW.order_id;

  IF current_count >= 3 THEN
    RAISE EXCEPTION 'PHOTO_LIMIT_REACHED'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER check_order_photos_limit_trigger
  BEFORE INSERT ON order_reference_photos
  FOR EACH ROW
  EXECUTE FUNCTION check_order_photos_limit();

-- 4. RLS sobre la tabla ----------------------------------------
ALTER TABLE order_reference_photos ENABLE ROW LEVEL SECURITY;

-- Admin lee todo
CREATE POLICY "order_reference_photos: admin all"
  ON order_reference_photos FOR ALL
  USING (is_admin(auth.uid()));

-- Cliente autenticado lee solo fotos de SUS ordenes
CREATE POLICY "order_reference_photos: customer select own"
  ON order_reference_photos FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders WHERE user_id = auth.uid()
    )
  );

-- 5. Bucket de Storage (privado, idempotente) ------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-photos', 'order-photos', false)
ON CONFLICT (id) DO NOTHING;

-- 6. RLS sobre storage.objects para bucket 'order-photos' ------
CREATE POLICY "order-photos: admin read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'order-photos' AND is_admin(auth.uid()));

CREATE POLICY "order-photos: admin insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'order-photos' AND is_admin(auth.uid()));

CREATE POLICY "order-photos: admin update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'order-photos' AND is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'order-photos' AND is_admin(auth.uid()));

CREATE POLICY "order-photos: admin delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'order-photos' AND is_admin(auth.uid()));

-- 7. Grants ----------------------------------------------------
GRANT SELECT ON order_reference_photos TO authenticated;
