-- ============================================================
-- 023_shipping_package_profiles.sql
-- Perfiles físicos de cajas individuales para cotización Andreani.
-- Medidas en milímetros, peso en gramos.
-- No se puede activar un perfil sin tener todas las medidas.
-- Sin lectura pública — solo accesible desde backend (service role).
-- ============================================================

CREATE TABLE shipping_package_profiles (
  id          text        PRIMARY KEY,
  label       text        NOT NULL,
  weight_g    integer     CHECK (weight_g  > 0),
  height_mm   integer     CHECK (height_mm > 0),
  width_mm    integer     CHECK (width_mm  > 0),
  length_mm   integer     CHECK (length_mm > 0),
  is_active   boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),

  -- Impide activar sin medidas completas
  CONSTRAINT active_requires_measurements CHECK (
    is_active = false
    OR (
      weight_g  IS NOT NULL AND
      height_mm IS NOT NULL AND
      width_mm  IS NOT NULL AND
      length_mm IS NOT NULL
    )
  )
);

ALTER TABLE shipping_package_profiles ENABLE ROW LEVEL SECURITY;

-- Sin lectura pública. El storefront accede solo vía /api/shipping/quote (service role).
CREATE POLICY "shipping_package_profiles: admin all"
  ON shipping_package_profiles FOR ALL
  USING (is_admin(auth.uid()));

-- ── Seed inicial ───────────────────────────────────────────
-- Ambos inactivos hasta que el admin cargue medidas reales.
INSERT INTO shipping_package_profiles (id, label) VALUES
  ('mate_box',            'Caja mate personalizado'),
  ('small_accessory_box', 'Caja accesorio pequeño (chapita, pulsera, llavero)');
