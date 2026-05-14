-- ============================================================
-- 017_customers_rpc.sql
-- Admin customer and ranking RPCs.
-- All money values are integer centavos ARS (no float).
-- ============================================================

CREATE OR REPLACE FUNCTION get_customers_for_admin(
  p_search text DEFAULT NULL,
  p_limit int DEFAULT 25,
  p_offset int DEFAULT 0
) RETURNS TABLE (
  email text,
  name text,
  phone text,
  order_count bigint,
  total_revenue bigint,
  last_order_at timestamptz,
  first_order_at timestamptz,
  is_vip boolean,
  total_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH customer_totals AS (
    SELECT
      o.customer_email AS email,
      (array_agg(o.customer_name ORDER BY o.created_at DESC))[1] AS name,
      (array_agg(o.customer_phone ORDER BY o.created_at DESC))[1] AS phone,
      count(*) AS order_count,
      coalesce(sum(o.total), 0)::bigint AS total_revenue,
      max(o.created_at) AS last_order_at,
      min(o.created_at) AS first_order_at
    FROM orders o
    WHERE
      p_search IS NULL
      OR p_search = ''
      OR o.customer_email ILIKE '%' || p_search || '%'
      OR o.customer_name ILIKE '%' || p_search || '%'
      OR o.customer_phone ILIKE '%' || p_search || '%'
    GROUP BY o.customer_email
  ),
  ranked AS (
    SELECT
      ct.*,
      ntile(5) OVER (ORDER BY ct.total_revenue DESC, ct.order_count DESC, ct.last_order_at DESC) AS revenue_quintile
    FROM customer_totals ct
  )
  SELECT
    r.email,
    r.name,
    r.phone,
    r.order_count,
    r.total_revenue,
    r.last_order_at,
    r.first_order_at,
    r.revenue_quintile = 1 AS is_vip,
    count(*) OVER () AS total_count
  FROM ranked r
  ORDER BY r.total_revenue DESC, r.order_count DESC, r.last_order_at DESC
  LIMIT greatest(p_limit, 0)
  OFFSET greatest(p_offset, 0);
$$;

REVOKE ALL ON FUNCTION get_customers_for_admin(text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_customers_for_admin(text, int, int) TO service_role;

CREATE OR REPLACE FUNCTION get_customers_kpis()
RETURNS TABLE (
  total_customers bigint,
  new_this_month bigint,
  recurring bigint,
  vip_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH customer_totals AS (
    SELECT
      o.customer_email AS email,
      count(*) AS order_count,
      coalesce(sum(o.total), 0)::bigint AS total_revenue,
      min(o.created_at) AS first_order_at
    FROM orders o
    GROUP BY o.customer_email
  ),
  ranked AS (
    SELECT
      ct.*,
      ntile(5) OVER (ORDER BY ct.total_revenue DESC, ct.order_count DESC) AS revenue_quintile,
      count(*) OVER () AS total_customers_count
    FROM customer_totals ct
  )
  SELECT
    count(*)::bigint AS total_customers,
    count(*) FILTER (
      WHERE first_order_at >= date_trunc('month', now())
    )::bigint AS new_this_month,
    count(*) FILTER (WHERE order_count > 1)::bigint AS recurring,
    CASE
      WHEN count(*) < 10 THEN NULL
      ELSE count(*) FILTER (WHERE revenue_quintile = 1)::bigint
    END AS vip_count
  FROM ranked;
$$;

REVOKE ALL ON FUNCTION get_customers_kpis() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_customers_kpis() TO service_role;

CREATE OR REPLACE FUNCTION get_top_products(
  p_limit int DEFAULT 10
) RETURNS TABLE (
  product_name text,
  variant_name text,
  qty_sold bigint,
  revenue bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    oi.product_name,
    oi.variant_name,
    sum(oi.quantity)::bigint AS qty_sold,
    coalesce(sum(oi.subtotal), 0)::bigint AS revenue
  FROM order_items oi
  GROUP BY oi.product_name, oi.variant_name
  ORDER BY qty_sold DESC, revenue DESC, oi.product_name ASC, oi.variant_name ASC
  LIMIT greatest(p_limit, 0);
$$;

REVOKE ALL ON FUNCTION get_top_products(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_top_products(int) TO service_role;

CREATE OR REPLACE FUNCTION get_top_customers(
  p_limit int DEFAULT 10
) RETURNS TABLE (
  email text,
  name text,
  order_count bigint,
  total_revenue bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.customer_email AS email,
    (array_agg(o.customer_name ORDER BY o.created_at DESC))[1] AS name,
    count(*)::bigint AS order_count,
    coalesce(sum(o.total), 0)::bigint AS total_revenue
  FROM orders o
  GROUP BY o.customer_email
  ORDER BY total_revenue DESC, order_count DESC, email ASC
  LIMIT greatest(p_limit, 0);
$$;

REVOKE ALL ON FUNCTION get_top_customers(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_top_customers(int) TO service_role;
