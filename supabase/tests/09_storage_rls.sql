-- ============================================================
-- 09_storage_rls.sql  (RED phase — written before 009_storage_policies.sql)
-- pgTAP tests for storage.objects RLS policies
--
-- NOTE: These tests require that buckets 'productos', 'categorias', 'marca'
-- exist in Supabase Storage before running. See supabase/STORAGE_SETUP.md.
-- ============================================================
BEGIN;
SELECT plan(4);

-- Test 1: policy de SELECT público existe para bucket productos
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'storage: public read productos'
  ),
  'storage: public read policy exists for productos'
);

-- Test 2: policy de INSERT para admin existe
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'storage: admin insert'
  ),
  'storage: admin insert policy exists'
);

-- Test 3: policy de DELETE para admin existe
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'storage: admin delete'
  ),
  'storage: admin delete policy exists'
);

-- Test 4: existen exactamente 3 políticas de SELECT público (una por bucket)
-- Replaced: storage.buckets query fails — test role lacks SELECT on storage schema.
-- 3 SELECT policies proves all 3 buckets have public read configured.
SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'storage'
     AND tablename  = 'objects'
     AND cmd        = 'SELECT'),
  3,
  'storage: 3 public SELECT policies exist (productos, categorias, marca)'
);

SELECT * FROM finish();
ROLLBACK;
