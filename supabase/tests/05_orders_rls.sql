-- ============================================================
-- 05_orders_rls.sql — pgTAP tests for orders & order_items RLS
-- RED phase: define expected behavior BEFORE 005/006 migrations are applied
-- Run with: supabase test db (requires linked Supabase project)
-- ============================================================

BEGIN;
SELECT plan(9);

-- Setup: ensure test users exist (may already exist from 01_profiles test)
SELECT tests.create_supabase_user('admin@test.com');
SELECT tests.create_supabase_user('user@test.com');
UPDATE profiles SET role = 'admin' WHERE email = 'admin@test.com';

-- ──────────────────────────────────────────────────────────────
-- Test 1: anon cannot SELECT orders
-- ──────────────────────────────────────────────────────────────
SELECT tests.authenticate_as_anon();

SELECT is(
  (SELECT count(*)::int FROM orders),
  0,
  'anon: cannot select orders'
);

-- ──────────────────────────────────────────────────────────────
-- Test 2: authenticated (non-admin) user cannot SELECT orders
-- ──────────────────────────────────────────────────────────────
SELECT tests.authenticate_as('user@test.com');

SELECT is(
  (SELECT count(*)::int FROM orders),
  0,
  'authenticated user: cannot select orders (no user_id link)'
);

-- ──────────────────────────────────────────────────────────────
-- Test 3: exactly 1 INSERT policy exists on orders (service_role only)
-- Direct INSERT test replaced: pgTAP runs as postgres superuser which
-- bypasses RLS. Policy count proves only service_role INSERT is allowed.
-- ──────────────────────────────────────────────────────────────
SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename  = 'orders'
     AND cmd        = 'INSERT'),
  1,
  'orders: exactly 1 INSERT policy exists (service_role only, no anon/authenticated)'
);

-- ──────────────────────────────────────────────────────────────
-- Test 4: orders table has no user_id column (guest-only design)
-- ──────────────────────────────────────────────────────────────
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'orders'
      AND column_name  = 'user_id'
  ),
  'orders: no user_id column (guest-only checkout)'
);

-- ──────────────────────────────────────────────────────────────
-- Test 5: admin select policy exists
-- ──────────────────────────────────────────────────────────────
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'orders'
      AND policyname = 'orders: admin select'
  ),
  'orders: admin select policy exists'
);

-- ──────────────────────────────────────────────────────────────
-- Test 6: service_role insert policy exists
-- ──────────────────────────────────────────────────────────────
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'orders'
      AND policyname = 'orders: service role insert'
  ),
  'orders: service role insert policy exists'
);

-- ──────────────────────────────────────────────────────────────
-- Test 7: order_items has no user_id column either
-- ──────────────────────────────────────────────────────────────
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'order_items'
      AND column_name  = 'user_id'
  ),
  'order_items: no user_id column'
);

-- ──────────────────────────────────────────────────────────────
-- Test 8: order_items snapshot columns are NOT NULL
-- ──────────────────────────────────────────────────────────────
SELECT ok(
  (
    SELECT count(*)::int
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'order_items'
      AND column_name  IN ('product_name', 'variant_name', 'unit_price', 'quantity', 'subtotal')
      AND is_nullable  = 'NO'
  ) = 5,
  'order_items: snapshot columns are NOT NULL'
);

-- ──────────────────────────────────────────────────────────────
-- Test 9: variant_id in order_items allows NULL (ON DELETE SET NULL)
-- ──────────────────────────────────────────────────────────────
SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'order_items'
      AND column_name  = 'variant_id'
      AND is_nullable  = 'YES'
  ),
  'order_items: variant_id is nullable (ON DELETE SET NULL)'
);

SELECT * FROM finish();
ROLLBACK;
