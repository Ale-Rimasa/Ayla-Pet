'use server'

import { z } from 'zod'
import { revalidatePath, revalidateTag } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { updateOrderStatus as dbUpdateOrderStatus, getOrderById } from '@/lib/db/orders'
import { UpdateOrderStatusSchema } from '@/lib/validations'
import type { UpdateOrderStatusInput } from '@/lib/validations'
import type { OrderStatus } from '@/types'

const OrderIdSchema = z.string().uuid()

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending:    ['paid', 'cancelled'],
  paid:       ['processing', 'cancelled', 'refunded'],
  processing: ['shipped', 'cancelled'],
  shipped:    ['delivered'],
  delivered:  [],
  cancelled:  ['refunded'],
  refunded:   [],
}

export async function updateOrderStatus(
  input: UpdateOrderStatusInput
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireAdmin()

  const parsed = UpdateOrderStatusSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'validation_error' }
  }

  const { orderId, status } = parsed.data

  // Service-role required: status query + history insert bypass RLS (requireAdmin validates above)
  const supabase = createAdminClient()

  // Fetch current status
  const { data: order } = await supabase
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .maybeSingle()

  const currentStatus = (order as { status: OrderStatus } | null)?.status

  if (!currentStatus) {
    return { ok: false, error: 'order_not_found' }
  }

  // Validate transition
  const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? []
  if (!allowed.includes(status)) {
    return { ok: false, error: 'invalid_transition' }
  }

  const result = await dbUpdateOrderStatus(orderId, status, user.id)

  if (!result.ok) {
    return { ok: false, error: result.error }
  }

  revalidatePath('/admin/pedidos')
  revalidateTag(`pedido:${orderId}`)

  return { ok: true }
}

// No requireAdmin — UUID is the capability token (pre-cuentas phase, no customer auth).
// getOrderById uses createAdminClient (service-role) to bypass RLS on orders, which
// is otherwise locked to authenticated users. Risk accepted: UUID is unguessable;
// only status is exposed; no PII. Re-evaluate when customer accounts (fase 5) land.
export async function getOrderStatus(
  orderId: string
): Promise<{ status: OrderStatus } | null> {
  const parsed = OrderIdSchema.safeParse(orderId)
  if (!parsed.success) return null
  const order = await getOrderById(parsed.data)
  if (!order) return null
  return { status: order.status }
}
