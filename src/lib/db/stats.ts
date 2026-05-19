import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth'
import type { Product, Order } from '@/types'

export interface StatsData {
  totalRevenue: number
  totalOrders: number
  activeProducts: number
  revenueThisMonth: number
  ordersThisMonth: number
  revenueDelta: number
  ordersDelta: number
  salesByMonth: { month: string; revenue: number; orders: number }[]
  salesByCategory: { name: string; value: number }[]
  paymentMethodData: { name: string; value: number }[]
  orderStatusData: { name: string; value: number }[]
  lowStockProducts: Product[]
  recentOrders: Order[]
}

export interface TopProductRow {
  productName: string
  variantName: string
  qtySold: number
  revenue: number
}

export interface TopCustomerRow {
  email: string
  name: string
  orderCount: number
  totalRevenue: number
}

type RevenueRow = { total: number; created_at: string }
type SalesRow = { total: number; created_at: string; status: string }
type TopProductRpcRow = {
  product_name: string
  variant_name: string
  qty_sold: number
  revenue: number
}
type TopCustomerRpcRow = {
  email: string
  name: string
  order_count: number
  total_revenue: number
}
type CategoryValueRow = {
  price: number
  products: { categories: { name: string } | null } | null
}
type PaymentRow = { payment_method_id: string | null }
type StatusRow = { status: string | null }
type LowStockRow = {
  id: string
  name: string
  sku: string | null
  price: number
  stock: number
  sort_order: number
  created_at: string
  updated_at: string
  products: {
    id: string
    name: string
    slug: string
    description: string | null
    category_id: string
    images: string[] | null
    featured: boolean
    deleted_at: string | null
    created_at: string
    updated_at: string
  } | null
}
type RecentOrderRow = {
  id: string
  status: string
  customer_name: string
  customer_email: string
  customer_phone: string
  shipping_street: string
  shipping_city: string
  shipping_province: string
  shipping_postal_code: string
  subtotal: number
  shipping_cost: number
  total: number
  mp_preference_id: string | null
  mp_payment_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  order_items: Array<{
    id: string
    variant_id: string | null
    product_name: string
    variant_name: string
    unit_price: number
    quantity: number
    subtotal: number
    image_url: string | null
    created_at: string
  }>
}

export async function getStats(): Promise<StatsData> {
  await requireAdmin()
  const supabase = createAdminClient()

  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString()

  const [
    revenueResult,
    ordersResult,
    activeProductsResult,
    salesByMonthResult,
    salesByCategoryResult,
    paymentMethodResult,
    orderStatusResult,
    lowStockResult,
    recentOrdersResult,
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('total, created_at')
      .in('status', ['paid', 'delivered', 'processing', 'shipped']),

    supabase
      .from('orders')
      .select('id, created_at', { count: 'exact' }),

    supabase
      .from('products')
      .select('id', { count: 'exact' })
      .is('deleted_at', null),

    supabase
      .from('orders')
      .select('total, created_at, status')
      .gte('created_at', sixMonthsAgo)
      .order('created_at', { ascending: false }),

    supabase
      .from('product_variants')
      .select('price, products!inner(category_id, categories!inner(name))')
      .is('products.deleted_at', null),

    supabase
      .from('payments')
      .select('payment_method_id')
      .eq('status', 'approved'),

    supabase
      .from('orders')
      .select('status')
      .limit(1000),

    supabase
      .from('product_variants')
      .select('*, products(*)')
      .lte('stock', 5)
      .order('stock', { ascending: true })
      .limit(10),

    supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const allOrders = (revenueResult.data ?? []) as RevenueRow[]
  const totalRevenue = allOrders.reduce((sum, o) => sum + (o.total ?? 0), 0)

  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const ordersThisMonth = allOrders.filter(
    (o) => new Date(o.created_at) >= startOfThisMonth
  )
  const ordersLastMonth = allOrders.filter((o) => {
    const d = new Date(o.created_at)
    return d >= startOfLastMonth && d < startOfThisMonth
  })

  const revenueThisMonth = ordersThisMonth.reduce((sum, o) => sum + (o.total ?? 0), 0)
  const revenueLastMonth = ordersLastMonth.reduce((sum, o) => sum + (o.total ?? 0), 0)

  const revenueDelta =
    revenueLastMonth === 0
      ? revenueThisMonth > 0 ? 100 : 0
      : Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)

  const allOrderRows = (ordersResult.data ?? []) as { created_at: string }[]
  const ordersThisMonthCount = allOrderRows.filter(
    (o) => new Date(o.created_at) >= startOfThisMonth
  ).length
  const ordersLastMonthCount = allOrderRows.filter((o) => {
    const d = new Date(o.created_at)
    return d >= startOfLastMonth && d < startOfThisMonth
  }).length

  const ordersDelta =
    ordersLastMonthCount === 0
      ? ordersThisMonthCount > 0 ? 100 : 0
      : Math.round(((ordersThisMonthCount - ordersLastMonthCount) / ordersLastMonthCount) * 100)

  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const salesByMonthMap: Record<string, { revenue: number; orders: number }> = {}

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`
    salesByMonthMap[key] = { revenue: 0, orders: 0 }
  }

  for (const order of (salesByMonthResult.data ?? []) as SalesRow[]) {
    const d = new Date(order.created_at)
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`
    if (key in salesByMonthMap) {
      if (['paid', 'delivered', 'processing', 'shipped'].includes(order.status)) {
        salesByMonthMap[key].revenue += order.total ?? 0
      }
      salesByMonthMap[key].orders += 1
    }
  }

  const salesByMonth = Object.entries(salesByMonthMap).map(([month, { revenue, orders }]) => ({
    month,
    revenue,
    orders,
  }))

  const categoryValueMap: Record<string, number> = {}
  for (const row of (salesByCategoryResult.data ?? []) as CategoryValueRow[]) {
    const catName = row?.products?.categories?.name ?? 'Sin categoría'
    categoryValueMap[catName] = (categoryValueMap[catName] ?? 0) + (row.price ?? 0)
  }
  const salesByCategory = Object.entries(categoryValueMap).map(([name, value]) => ({
    name,
    value,
  }))

  const paymentMethodMap: Record<string, number> = {}
  for (const row of (paymentMethodResult.data ?? []) as PaymentRow[]) {
    const method = row?.payment_method_id ?? 'Otro'
    const label = method === 'credit_card' ? 'Tarjeta crédito'
      : method === 'debit_card' ? 'Tarjeta débito'
      : method === 'account_money' ? 'Dinero en cuenta'
      : method === 'bank_transfer' ? 'Transferencia'
      : method
    paymentMethodMap[label] = (paymentMethodMap[label] ?? 0) + 1
  }
  const paymentMethodData = Object.entries(paymentMethodMap).map(([name, value]) => ({ name, value }))

  const statusLabels: Record<string, string> = {
    pending: 'Pendiente', paid: 'Pagado', processing: 'En proceso',
    shipped: 'Enviado', delivered: 'Entregado', cancelled: 'Cancelado', refunded: 'Reembolsado',
  }
  const statusMap: Record<string, number> = {}
  for (const row of (orderStatusResult.data ?? []) as StatusRow[]) {
    const status = row?.status ?? 'pending'
    const label = statusLabels[status] ?? status
    statusMap[label] = (statusMap[label] ?? 0) + 1
  }
  const orderStatusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }))

  const lowStockProducts: Product[] = ((lowStockResult.data ?? []) as LowStockRow[])
    .map((r): Product | null => {
      const product = r.products
      if (!product) return null
      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description ?? undefined,
        categoryId: product.category_id,
        images: [],
        featured: product.featured,
        variants: [
          {
            id: r.id,
            productId: product.id,
            name: r.name,
            sku: r.sku ?? undefined,
            price: r.price,
            stock: r.stock,
            sortOrder: r.sort_order,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          },
        ],
        deletedAt: product.deleted_at ?? undefined,
        createdAt: product.created_at,
        updatedAt: product.updated_at,
      }
    })
    .filter((p): p is Product => p !== null)

  const recentOrders: Order[] = ((recentOrdersResult.data ?? []) as RecentOrderRow[]).map((r) => ({
    id: r.id,
    status: r.status as Order['status'],
    customer: {
      name: r.customer_name,
      email: r.customer_email,
      phone: r.customer_phone,
    },
    shippingAddress: {
      street: r.shipping_street,
      city: r.shipping_city,
      province: r.shipping_province,
      postalCode: r.shipping_postal_code,
    },
    items: (r.order_items ?? []).map((i) => ({
      id: i.id,
      variantId: i.variant_id,
      productName: i.product_name,
      variantName: i.variant_name,
      unitPrice: i.unit_price,
      quantity: i.quantity,
      subtotal: i.subtotal,
      imageUrl: i.image_url,
      createdAt: i.created_at,
    })),
    subtotal: r.subtotal,
    shippingCost: r.shipping_cost,
    total: r.total,
    mpPreferenceId: r.mp_preference_id,
    mpPaymentId: r.mp_payment_id,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))

  return {
    totalRevenue,
    totalOrders: ordersResult.count ?? 0,
    activeProducts: activeProductsResult.count ?? 0,
    revenueThisMonth,
    ordersThisMonth: ordersThisMonthCount,
    revenueDelta,
    ordersDelta,
    salesByMonth,
    salesByCategory,
    paymentMethodData,
    orderStatusData,
    lowStockProducts,
    recentOrders,
  }
}

export async function getTopProducts(limit = 10): Promise<TopProductRow[]> {
  // Defense-in-depth: service-role bypasses RLS — require admin session.
  await requireAdmin()
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('get_top_products', { p_limit: limit })

  if (error) {
    console.error('[stats] getTopProducts failed:', error.message)
    return []
  }

  return ((data as TopProductRpcRow[] | null) ?? []).map((row) => ({
    productName: row.product_name,
    variantName: row.variant_name,
    qtySold: row.qty_sold,
    revenue: row.revenue,
  }))
}

export async function getTopCustomers(limit = 10): Promise<TopCustomerRow[]> {
  // Defense-in-depth: service-role bypasses RLS — require admin session.
  await requireAdmin()
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('get_top_customers', { p_limit: limit })

  if (error) {
    console.error('[stats] getTopCustomers failed:', error.message)
    return []
  }

  return ((data as TopCustomerRpcRow[] | null) ?? []).map((row) => ({
    email: row.email,
    name: row.name,
    orderCount: row.order_count,
    totalRevenue: row.total_revenue,
  }))
}
