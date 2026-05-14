-- ============================================================
-- 016_grants.sql
-- Explicit table and function grants required for PostgREST API access.
--
-- Context: From 2026-05-30, new Supabase projects no longer expose
-- public schema tables to the API by default. Without these GRANTs,
-- supabase-js / PostgREST return error 42501.
--
-- Strategy:
--   anon         → public catalog read (products, categories, variants)
--   authenticated → catalog read + own data read (RLS enforces row-level)
--   service_role  → full access on all tables (used by webhooks, Server Actions)
--
-- RLS policies (already in 001-015) handle row-level access AFTER these
-- table-level grants are satisfied.
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- profiles
-- anon: no access (private user data)
-- authenticated: SELECT own row (RLS: auth.uid() = id)
-- service_role: full (trigger handle_new_user, admin panel)
-- ──────────────────────────────────────────────────────────────
GRANT SELECT                        ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;

-- ──────────────────────────────────────────────────────────────
-- categories
-- Public catalog — anon + authenticated can read active rows (RLS: deleted_at IS NULL)
-- service_role: full (admin ABM via Server Actions)
-- ──────────────────────────────────────────────────────────────
GRANT SELECT                        ON public.categories TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO service_role;

-- ──────────────────────────────────────────────────────────────
-- products
-- Public catalog — same as categories
-- ──────────────────────────────────────────────────────────────
GRANT SELECT                        ON public.products TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO service_role;

-- ──────────────────────────────────────────────────────────────
-- product_variants
-- Needed for product detail, cart stock checks, and checkout
-- ──────────────────────────────────────────────────────────────
GRANT SELECT                        ON public.product_variants TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO service_role;

-- ──────────────────────────────────────────────────────────────
-- orders
-- anon: no access
-- authenticated: SELECT (RLS: is_admin for admin panel; fase5 will add customer own-row policy)
-- service_role: full (webhook, /api/orders, admin Server Actions)
-- ──────────────────────────────────────────────────────────────
GRANT SELECT                        ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO service_role;

-- ──────────────────────────────────────────────────────────────
-- order_items
-- Same pattern as orders
-- ──────────────────────────────────────────────────────────────
GRANT SELECT                        ON public.order_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO service_role;

-- ──────────────────────────────────────────────────────────────
-- order_status_history
-- Admin audit trail; customer read deferred to fase5
-- ──────────────────────────────────────────────────────────────
GRANT SELECT                        ON public.order_status_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_status_history TO service_role;

-- ──────────────────────────────────────────────────────────────
-- payments
-- Internal only — only service_role (webhook handler via recordMPPayment)
-- No authenticated access: payment data is not exposed to clients
-- ──────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO service_role;

-- ──────────────────────────────────────────────────────────────
-- rate_limit_events
-- Internal only — checkRateLimit uses createAdminClient (service_role)
-- ──────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rate_limit_events TO service_role;

-- ──────────────────────────────────────────────────────────────
-- RPC: update_order_status_atomic (added in 015, missing GRANT)
-- Called via createAdminClient (service_role) from lib/db/orders.ts
-- ──────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION update_order_status_atomic(uuid, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_order_status_atomic(uuid, text, text, uuid) TO service_role;

-- ──────────────────────────────────────────────────────────────
-- Sequence grants (required for INSERT with SERIAL/IDENTITY columns)
-- rate_limit_events.id uses bigint generated always as identity
-- ──────────────────────────────────────────────────────────────
GRANT USAGE ON SEQUENCE public.rate_limit_events_id_seq TO service_role;
