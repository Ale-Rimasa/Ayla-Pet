-- ============================================================
-- 003_products.sql
-- products table with FK to categories, soft-delete, RLS
-- ============================================================

CREATE TABLE products (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id  uuid        NOT NULL REFERENCES categories(id),
  name         text        NOT NULL,
  slug         text        NOT NULL,
  description  text,
  images       text[]      NOT NULL DEFAULT '{}',
  featured     boolean     NOT NULL DEFAULT false,
  deleted_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Slug unique only among non-deleted products
CREATE UNIQUE INDEX products_slug_active_idx
  ON products (slug)
  WHERE deleted_at IS NULL;

CREATE INDEX products_category_id_idx
  ON products (category_id)
  WHERE deleted_at IS NULL;

-- Fast query for featured products on homepage
CREATE INDEX products_featured_idx
  ON products (featured)
  WHERE featured = true AND deleted_at IS NULL;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Public reads active products only
CREATE POLICY "products: public select"
  ON products FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "products: admin insert"
  ON products FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "products: admin update"
  ON products FOR UPDATE
  USING  (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "products: admin delete"
  ON products FOR DELETE
  USING (is_admin(auth.uid()));
