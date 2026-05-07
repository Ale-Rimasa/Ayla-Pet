-- ============================================================
-- 009_storage_policies.sql
-- RLS policies para Storage buckets
--
-- PREREQUISITO: Los buckets 'productos', 'categorias', 'marca'
-- deben existir en Supabase Dashboard ANTES de aplicar esta migración.
-- Ver supabase/STORAGE_SETUP.md
-- ============================================================

-- Lectura pública para los 3 buckets
CREATE POLICY "storage: public read productos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'productos');

CREATE POLICY "storage: public read categorias"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'categorias');

CREATE POLICY "storage: public read marca"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'marca');

-- Upload solo para admin
CREATE POLICY "storage: admin insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id IN ('productos', 'categorias', 'marca')
    AND is_admin(auth.uid())
  );

-- Actualización solo para admin
CREATE POLICY "storage: admin update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id IN ('productos', 'categorias', 'marca')
    AND is_admin(auth.uid())
  )
  WITH CHECK (
    bucket_id IN ('productos', 'categorias', 'marca')
    AND is_admin(auth.uid())
  );

-- Borrado solo para admin
CREATE POLICY "storage: admin delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id IN ('productos', 'categorias', 'marca')
    AND is_admin(auth.uid())
  );
