-- ============================================================
-- 002_categories.sql
-- categories table with soft-delete, slug partial unique index, RLS
-- ============================================================

CREATE TABLE categories (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  slug        text        NOT NULL,
  description text,
  image_url   text,
  sort_order  int         NOT NULL DEFAULT 0,
  deleted_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Slug is unique only among non-deleted rows (allows reuse after soft-delete)
CREATE UNIQUE INDEX categories_slug_active_idx
  ON categories (slug)
  WHERE deleted_at IS NULL;

CREATE INDEX categories_sort_order_idx
  ON categories (sort_order)
  WHERE deleted_at IS NULL;

CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Public can read active categories
CREATE POLICY "categories: public select"
  ON categories FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "categories: admin insert"
  ON categories FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "categories: admin update"
  ON categories FOR UPDATE
  USING  (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Admin delete (soft-delete preferred: set deleted_at via UPDATE)
CREATE POLICY "categories: admin delete"
  ON categories FOR DELETE
  USING (is_admin(auth.uid()));
