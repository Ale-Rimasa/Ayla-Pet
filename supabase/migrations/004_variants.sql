-- ============================================================
-- 004_variants.sql
-- product_variants with price/stock constraints, ON DELETE CASCADE, RLS
-- ============================================================

CREATE TABLE product_variants (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  sku         text,
  price       integer     NOT NULL CHECK (price > 0),      -- centavos ARS
  stock       integer     NOT NULL DEFAULT 0 CHECK (stock >= 0),
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- SKU unique only when present (nullable allowed for variants without SKU)
CREATE UNIQUE INDEX variants_sku_idx
  ON product_variants (sku)
  WHERE sku IS NOT NULL;

CREATE INDEX variants_product_id_idx
  ON product_variants (product_id);

CREATE TRIGGER variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- Public can read all variants (stock visible to clients for UX)
CREATE POLICY "variants: public select"
  ON product_variants FOR SELECT
  USING (true);

CREATE POLICY "variants: admin insert"
  ON product_variants FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "variants: admin update"
  ON product_variants FOR UPDATE
  USING  (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "variants: admin delete"
  ON product_variants FOR DELETE
  USING (is_admin(auth.uid()));
