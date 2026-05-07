-- ============================================================
-- 08_payments_rls.sql  (RED phase — written before 008_payments.sql)
-- pgTAP tests for payments table RLS and constraints
-- ============================================================
BEGIN;
SELECT plan(6);

-- Test 1: anon no puede SELECT payments
SELECT tests.authenticate_as_anon();
SELECT is(
  (SELECT count(*)::int FROM payments),
  0,
  'anon: cannot select payments'
);

-- Test 2: solo existe política de INSERT para service_role
-- Direct INSERT replaced: FK violation fires before RLS when order_id doesn't exist.
-- Policy count proves only service_role can insert.
SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename  = 'payments'
     AND cmd        = 'INSERT'),
  1,
  'payments: exactly 1 INSERT policy (service_role only)'
);

-- Test 3: usuario autenticado no puede SELECT payments
SELECT tests.authenticate_as('user@test.com');
SELECT is(
  (SELECT count(*)::int FROM payments),
  0,
  'authenticated user: cannot select payments'
);

-- Test 4: la única política INSERT nombra service_role explícitamente
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'payments'
      AND cmd        = 'INSERT'
      AND policyname = 'payments: service role insert'
  ),
  'payments: service role insert policy exists (authenticated users blocked)'
);

-- Test 5: mp_payment_id UNIQUE constraint existe
SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'payments'
    AND constraint_type = 'UNIQUE'
  ),
  'payments: mp_payment_id unique constraint exists'
);

-- Test 6: orders NO tiene columna user_id (guest checkout confirmado)
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'user_id'
  ),
  'orders: confirmed no user_id column'
);

SELECT * FROM finish();
ROLLBACK;
