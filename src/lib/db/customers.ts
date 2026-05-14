import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export interface CustomerRow {
  email: string
  name: string
  phone: string
  orderCount: number
  totalRevenue: number
  lastOrderAt: string
  firstOrderAt: string
  isVip: boolean
}

export interface CustomerKpis {
  totalCustomers: number
  newThisMonth: number
  recurring: number
  vipCount: number | null
}

interface DbCustomerRow {
  email: string
  name: string
  phone: string
  order_count: number
  total_revenue: number
  last_order_at: string
  first_order_at: string
  is_vip: boolean
  total_count: number
}

interface DbCustomerKpis {
  total_customers: number
  new_this_month: number
  recurring: number
  vip_count?: number | null
}

export interface GetCustomersForAdminOptions {
  search?: string
  page?: number
  pageSize?: number
}

function mapCustomerRow(row: DbCustomerRow): CustomerRow {
  return {
    email: row.email,
    name: row.name,
    phone: row.phone,
    orderCount: row.order_count,
    totalRevenue: row.total_revenue,
    lastOrderAt: row.last_order_at,
    firstOrderAt: row.first_order_at,
    isVip: row.is_vip,
  }
}

function mapCustomerKpis(row?: DbCustomerKpis): CustomerKpis {
  return {
    totalCustomers: row?.total_customers ?? 0,
    newThisMonth: row?.new_this_month ?? 0,
    recurring: row?.recurring ?? 0,
    vipCount: row?.vip_count ?? null,
  }
}

export async function getCustomersForAdmin(
  opts: GetCustomersForAdminOptions = {}
): Promise<{ rows: CustomerRow[]; total: number }> {
  await requireAdmin()

  const { search, page = 1, pageSize = 25 } = opts

  // Service-role required: orders table RLS restricts access; GROUP BY aggregation requires full read.
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('get_customers_for_admin', {
    ...(search ? { p_search: search } : {}),
    p_limit: pageSize,
    p_offset: (page - 1) * pageSize,
  })

  if (error) {
    console.error('[customers] getCustomersForAdmin failed:', error.message)
    return { rows: [], total: 0 }
  }

  const rows = ((data as DbCustomerRow[] | null) ?? []).map(mapCustomerRow)

  return {
    rows,
    total: (data as DbCustomerRow[] | null)?.[0]?.total_count ?? 0,
  }
}

export async function getCustomersKpis(): Promise<CustomerKpis> {
  await requireAdmin()

  // Service-role required: orders table RLS restricts access; analytics require full read.
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('get_customers_kpis')

  if (error) {
    console.error('[customers] getCustomersKpis failed:', error.message)
    return mapCustomerKpis()
  }

  return mapCustomerKpis((data as DbCustomerKpis[] | null)?.[0])
}
