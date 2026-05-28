-- ============================================================
-- 028_storage_hero_policies.sql
-- RLS policies para el bucket 'hero'.
--
-- PREREQUISITO: el bucket 'hero' (publico) debe existir en
-- Supabase Dashboard ANTES de aplicar esta migracion.
-- Ver supabase/STORAGE_SETUP.md
-- ============================================================

-- Lectura publica del bucket hero
CREATE POLICY "storage: public read hero"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'hero');

-- Insert solo admin
CREATE POLICY "storage: admin insert hero"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'hero' AND is_admin(auth.uid()));

-- Update solo admin
CREATE POLICY "storage: admin update hero"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'hero' AND is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'hero' AND is_admin(auth.uid()));

-- Delete solo admin
CREATE POLICY "storage: admin delete hero"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'hero' AND is_admin(auth.uid()));
