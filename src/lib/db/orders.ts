import { createAdminClient } from '@/lib/supabase/admin'
import type { Order, OrderItem, OrderStatus, CreateOrderPayload } from '@/types'

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
  created_at: string
  updated_at: string
  order_items: DbOrderItem[]
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
    p_notes: payload.notes ?? undefined,
    p_items: payload.items.map((item) => ({
      variant_id: item.variantId,
      product_name: item.productName,
      variant_name: item.variantName,
      unit_price: item.unitPrice,
      quantity: item.quantity,
      subtotal: item.subtotal,
      image_url: item.imageUrl ?? null,
    })),
  }

  const { data, error } = await supabase.rpc('create_order', params)

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

export interface GetOrdersForAdminOptions {
  status?: OrderStatus
  page?: number
  pageSize?: number
}

export async function getOrdersForAdmin(
  opts: GetOrdersForAdminOptions = {}
): Promise<{ data: Order[]; count: number }> {
  const { status, page = 1, pageSize = 20 } = opts
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

  const { data, count } = await query

  const orders = (data as unknown as DbOrder[] ?? []).map(mapOrder)

  return { data: orders, count: count ?? 0 }
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  actorId?: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient()

  const { data: current } = await supabase
    .from('orders')
    .select('status')
    .eq('id', id)
    .maybeSingle()

  const fromStatus = (current as { status: OrderStatus } | null)?.status ?? null

  // Conditional UPDATE: only applies if status hasn't changed since we read it above.
  // If another concurrent call already changed the status, count === 0 → conflict error.
  const { count, error: updateError } = await supabase
    .from('orders')
    .update({ status }, { count: 'exact' })
    .eq('id', id)
    .eq('status', fromStatus as string)

  if (updateError) {
    return { ok: false, error: updateError.message }
  }

  if (count === 0) {
    return { ok: false, error: 'concurrent_modification' }
  }

  await supabase.from('order_status_history').insert({
    order_id: id,
    from_status: fromStatus,
    to_status: status,
    actor_id: actorId ?? null,
  })

  return { ok: true }
}
