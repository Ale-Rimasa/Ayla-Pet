-- ============================================================
-- 013_variants_soft_delete.sql
-- Add soft delete support to product_variants
-- ============================================================

ALTER TABLE product_variants
  ADD COLUMN deleted_at timestamptz;

CREATE INDEX variants_deleted_at_idx
  ON product_variants (deleted_at)
  WHERE deleted_at IS NULL;
