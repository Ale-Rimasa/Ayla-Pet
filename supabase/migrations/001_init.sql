-- ============================================================
-- 001_init.sql
-- user_role enum, profiles table, helper functions, RLS policies
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- TYPES
-- ──────────────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('admin', 'customer');

-- ──────────────────────────────────────────────────────────────
-- SHARED TRIGGER FUNCTION — updated_at
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
-- ──────────────────────────────────────────────────────────────
-- TABLE: profiles (extends auth.users)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text        NOT NULL UNIQUE,
  role        user_role   NOT NULL DEFAULT 'customer',
  full_name   text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ──────────────────────────────────────────────────────────────
-- HELPER: is_admin(uid)
-- STABLE + SECURITY DEFINER avoids RLS recursion and re-evaluation per row
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = uid AND role = 'admin'
  );
$$;


-- ──────────────────────────────────────────────────────────────
-- TRIGGER: auto-create profile on signup
-- SECURITY DEFINER so the trigger runs as the function owner (postgres),
-- bypassing RLS to perform the insert
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'customer')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ──────────────────────────────────────────────────────────────
-- RLS
-- ──────────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- User sees their own profile only
CREATE POLICY "profiles: own row select"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Admin sees all profiles (uses is_admin to avoid direct RLS recursion)
CREATE POLICY "profiles: admin select all"
  ON profiles FOR SELECT
  USING (is_admin(auth.uid()));

-- Only service_role can INSERT (via handle_new_user trigger)
-- No client-side signup should directly touch profiles
CREATE POLICY "profiles: service role insert"
  ON profiles FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Only service_role can UPDATE (prevents role self-escalation from client)
CREATE POLICY "profiles: service role update"
  ON profiles FOR UPDATE
  USING  (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- No DELETE allowed from any client role
-- (cascade from auth.users handles cleanup)
