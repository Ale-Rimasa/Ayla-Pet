import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import type { Order, OrderItem, OrderStatus, CreateOrderPayload } from '@/types'
import type { Database, Json } from '@/types/database'
import type { Agency } from '@/lib/correo-argentino'

// Extraemos el overload con los params de Fase 2 (agencia de destino) para
// tipado seguro del RPC — es la firma más reciente (19 args).
type CreateOrderArgs = Extract<
  Database['public']['Functions']['create_order'],
  { Args: { p_shipping_agency_snapshot?: Json } }
>['Args']

interface DbOrderItem {
  id: string
  order_id: string
  variant_id: string | null
  product_name: string
  variant_name: string
  unit_price: number
  quantity: number
  subtotal: number
  image_url: string | null
  created_at: string
}

interface DbOrder {
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
  engraving_text: string | null
  // Fulfillment de envío (Fase 2) — null en pedidos previos a esa fase.
  shipping_delivered_type: string | null
  shipping_product_type: string | null
  shipping_agency_code: string | null
  shipping_agency_snapshot: Agency | null
  created_at: string
  updated_at: string
  order_items: DbOrderItem[]
}

interface DbOrderStatusHistoryEntry {
  id: string
  order_id: string
  from_status: OrderStatus | null
  to_status: OrderStatus
  actor_id: string | null
  created_at: string
}

export interface OrderStatusHistoryEntry {
  id: string
  orderId: string
  fromStatus: OrderStatus | null
  toStatus: OrderStatus
  actorId: string | null
  createdAt: string
}

function mapOrderItem(item: DbOrderItem): OrderItem {
  return {
    id: item.id,
    variantId: item.variant_id,
    productName: item.product_name,
    variantName: item.variant_name,
    unitPrice: item.unit_price,
    quantity: item.quantity,
    subtotal: item.subtotal,
    imageUrl: item.image_url,
    createdAt: item.created_at,
  }
}

function mapOrder(row: DbOrder): Order {
  return {
    id: row.id,
    status: row.status as OrderStatus,
    customer: {
      name: row.customer_name,
      email: row.customer_email,
      phone: row.customer_phone,
    },
    shippingAddress: {
      street: row.shipping_street,
      city: row.shipping_city,
      province: row.shipping_province,
      postalCode: row.shipping_postal_code,
    },
    items: (row.order_items ?? []).map(mapOrderItem),
    subtotal: row.subtotal,
    shippingCost: row.shipping_cost,
    total: row.total,
    mpPreferenceId: row.mp_preference_id,
    mpPaymentId: row.mp_payment_id,
    notes: row.notes,
    engravingText: row.engraving_text ?? undefined,
    shippingDeliveredType: row.shipping_delivered_type as 'D' | 'S' | null,
    shippingProductType: row.shipping_product_type as 'CP' | 'EP' | null,
    shippingAgencyCode: row.shipping_agency_code,
    shippingAgencySnapshot: row.shipping_agency_snapshot,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapOrderStatusHistoryEntry(
  row: DbOrderStatusHistoryEntry
): OrderStatusHistoryEntry {
  return {
    id: row.id,
    orderId: row.order_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    actorId: row.actor_id,
    createdAt: row.created_at,
  }
}

export async function createOrder(
  payload: CreateOrderPayload
): Promise<{ ok: boolean; data?: { orderId: string }; error?: string }> {
  if (!payload.items || payload.items.length === 0) {
    return { ok: false, error: 'Order must have at least one item' }
  }

  const supabase = createAdminClient()

  const params = {
    p_user_id: payload.userId ?? null,
    p_customer_name: payload.customer.name,
    p_customer_email: payload.customer.email,
    p_customer_phone: payload.customer.phone,
    p_shipping_street: payload.shipping.street,
    p_shipping_city: payload.shipping.city,
    p_shipping_province: payload.shipping.province,
    p_shipping_postal_code: payload.shipping.postalCode,
    p_subtotal: payload.subtotal,
    p_shipping_cost: payload.shippingCost,
    p_total: payload.total,
    p_notes: payload.notes ?? null,
    p_items: payload.items.map((item) => ({
      variant_id: item.variantId,
      product_name: item.productName,
      variant_name: item.variantName,
      unit_price: item.unitPrice,
      quantity: item.quantity,
      subtotal: item.subtotal,
      image_url: item.imageUrl ?? null,
    })),
    // Snapshot de bultos — persistido atómicamente junto con la orden
    p_shipping_packages: (payload.shippingPackages ?? []).map((pkg) => ({
      package_profile_id: pkg.packageProfileId,
      bulto_index: pkg.bultoIndex,
      weight_g: pkg.weightG,
      height_mm: pkg.heightMm,
      width_mm: pkg.widthMm,
      length_mm: pkg.lengthMm,
    })),
    p_engraving_text: payload.engravingText ?? null,
    // Fulfillment de envío (Fase 2): tipo de entrega/producto + agencia destino.
    p_shipping_delivered_type: payload.deliveredType ?? null,
    p_shipping_product_type: payload.productType ?? null,
    p_shipping_agency_code: payload.agencyCode ?? null,
    p_shipping_agency_snapshot: (payload.agencySnapshot ?? null) as Json,
  }

  const { data, error } = await supabase.rpc('create_order', params as CreateOrderArgs)

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true, data: { orderId: data as string } }
}

export async function getOrderById(id: string): Promise<Order | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null

  return mapOrder(data as unknown as DbOrder)
}

// Defense-in-depth: full order includes customer PII — require admin session.
// Use getOrderById directly for non-admin contexts (webhook, payment preference, checkout).
export async function getOrderByIdForAdmin(id: string): Promise<Order | null> {
  await requireAdmin()
  return getOrderById(id)
}

export interface GetOrdersForAdminOptions {
  status?: OrderStatus
  searchQuery?: string
  page?: number
  pageSize?: number
}

export async function getOrdersForAdmin(
  opts: GetOrdersForAdminOptions = {}
): Promise<{ data: Order[]; count: number }> {
  // Defense-in-depth: service-role bypasses RLS — require admin session.
  await requireAdmin()
  const { status, searchQuery, page = 1, pageSize = 20 } = opts
  const supabase = createAdminClient()

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('orders')
    .select('*, order_items(*)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status) {
    query = query.eq('status', status)
  }

  if (searchQuery) {
    // Strip PostgREST filter syntax chars and escape SQL LIKE wildcards
    const safe = searchQuery
      .replace(/[,()]/g, '')   // PostgREST filter injection
      .replace(/[%_\\]/g, '\\$&')  // SQL LIKE wildcards
      .slice(0, 100)
    if (safe) {
      query = query.or(
        `customer_name.ilike.%${safe}%,customer_email.ilike.%${safe}%`
      )
    }
  }

  const { data, count } = await query

  const orders = (data as unknown as DbOrder[] ?? []).map(mapOrder)

  return { data: orders, count: count ?? 0 }
}

export async function getOrdersForCustomer(
  userId: string,
  opts: { page?: number; pageSize?: number } = {}
): Promise<{ data: Order[]; count: number }> {
  const { page = 1, pageSize = 20 } = opts
  const supabase = await createClient()

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, count, error } = await supabase
    .from('orders')
    .select('*, order_items(*)', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error || !data) return { data: [], count: 0 }

  return {
    data: (data as unknown as DbOrder[]).map(mapOrder),
    count: count ?? 0,
  }
}

export async function getOrderForCustomer(
  id: string,
  user: { id: string; email: string }
): Promise<Order | null> {
  const supabase = await createClient()

  // Validar email antes de usarlo en filtro PostgREST (evitar romper la sintaxis con comas/paréntesis).
  const safeEmail = /^[^,)(]+@[^,)(]+$/.test(user.email) ? user.email : ''

  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', id)
    .or(`user_id.eq.${user.id}${safeEmail ? `,customer_email.eq.${safeEmail}` : ''}`)
    .maybeSingle()

  if (error || !data) return null

  return mapOrder(data as unknown as DbOrder)
}

export async function getOrderStatusHistory(
  orderId: string
): Promise<OrderStatusHistoryEntry[]> {
  // Defense-in-depth: service-role, admin-only function
  await requireAdmin()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('order_status_history')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })

  if (error) return []

  return ((data as unknown as DbOrderStatusHistoryEntry[]) ?? []).map(
    mapOrderStatusHistoryEntry
  )
}

// Narrow query — only fetches status, no PII fields.
export async function getOrderStatusById(
  id: string
): Promise<{ status: OrderStatus } | null> {
  // Service-role required to bypass RLS on orders table
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('orders')
    .select('status')
    .eq('id', id)
    .maybeSingle()
  if (!data) return null
  return { status: (data as { status: OrderStatus }).status }
}

export async function updateOrderStatus(
  id: string,
  fromStatus: OrderStatus,
  status: OrderStatus,
  actorId?: string
): Promise<{ ok: boolean; error?: string }> {
  // Service-role required: update_order_status_atomic bypasses RLS.
  // RPC wraps UPDATE + history INSERT in one transaction — no audit gaps.
  const supabase = createAdminClient()

  // RPC not yet in generated types — regenerate after running migration 015.
  // Llamar como método (no extraer a variable) para preservar el `this` del cliente Supabase.
  type UpdateStatusRpc = (
    fn: 'update_order_status_atomic',
    args: { p_order_id: string; p_from_status: OrderStatus; p_new_status: OrderStatus; p_actor_id: string | null }
  ) => Promise<{ data: { ok: boolean; error?: string } | null; error: { message: string } | null }>

  const { data, error } = await (supabase.rpc as unknown as UpdateStatusRpc)('update_order_status_atomic', {
    p_order_id: id,
    p_from_status: fromStatus,
    p_new_status: status,
    p_actor_id: actorId ?? null,
  })

  if (error) return { ok: false, error: error.message }

  return data as { ok: boolean; error?: string }
}
