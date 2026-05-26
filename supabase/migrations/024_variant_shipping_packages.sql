-- ============================================================
-- 024_variant_shipping_packages.sql
-- Relación entre variante y los bultos que genera al despacharse.
-- Una variante puede generar uno o varios paquetes (combos).
-- UNIQUE(variant_id, package_profile_id): la cantidad se maneja
-- con la columna quantity, no con filas duplicadas.
-- Sin lectura pública — solo accesible desde backend (service role).
-- ============================================================

CREATE TABLE variant_shipping_packages (
  id                 uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id         uuid    NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  package_profile_id text    NOT NULL REFERENCES shipping_package_profiles(id),
  quantity           integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at         timestamptz NOT NULL DEFAULT now(),

  -- Evita filas duplicadas accidentales; la cantidad va en la columna quantity
  UNIQUE (variant_id, package_profile_id)
);

CREATE INDEX vsp_variant_id_idx ON variant_shipping_packages (variant_id);

ALTER TABLE variant_shipping_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "variant_shipping_packages: admin all"
  ON variant_shipping_packages FOR ALL
  USING (is_admin(auth.uid()));
