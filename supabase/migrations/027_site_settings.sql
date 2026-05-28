-- ============================================================
-- 027_site_settings.sql
-- Tabla key-value JSONB para configuracion editable del sitio.
-- Reads publicos (home, storefront), writes solo admin (is_admin).
-- ============================================================

CREATE TABLE site_settings (
  key        text        PRIMARY KEY,
  value      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger para mantener updated_at
CREATE OR REPLACE FUNCTION set_site_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER site_settings_set_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW
  EXECUTE FUNCTION set_site_settings_updated_at();

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Lectura publica (home necesita hero/store_info sin auth)
CREATE POLICY "site_settings: public select"
  ON site_settings FOR SELECT
  USING (true);

-- Escritura solo admin (defense-in-depth; las actions ya usan service-role)
CREATE POLICY "site_settings: admin all"
  ON site_settings FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Seed inicial: filas vacias para que UPSERT por key sea consistente.
-- value '{}' deja que el codigo aplique fallback de constants.
INSERT INTO site_settings (key, value) VALUES
  ('hero',        '{}'::jsonb),
  ('store_info',  '{}'::jsonb),
  ('transfer',    '{}'::jsonb),
  ('maintenance', '{}'::jsonb),
  ('branding',    '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;
