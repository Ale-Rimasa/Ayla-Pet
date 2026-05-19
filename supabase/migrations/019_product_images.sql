-- product_images: multi-image support per product
CREATE TABLE product_images (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   uuid        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url          text        NOT NULL,
  alt          text,
  label        text,
  sort_order   integer     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX product_images_product_id_idx
  ON product_images (product_id, sort_order);

ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_images: public select"
  ON product_images FOR SELECT
  USING (true);

CREATE POLICY "product_images: admin all"
  ON product_images FOR ALL
  USING (is_admin(auth.uid()));

-- Migrate existing images[] data
DO $$
DECLARE
  p   RECORD;
  img text;
  idx integer;
BEGIN
  FOR p IN
    SELECT id, images
    FROM products
    WHERE images IS NOT NULL AND array_length(images, 1) > 0
  LOOP
    idx := 0;
    FOREACH img IN ARRAY p.images
    LOOP
      INSERT INTO product_images (product_id, url, alt, sort_order)
      VALUES (p.id, img, NULL, idx);
      idx := idx + 1;
    END LOOP;
  END LOOP;
END $$;
