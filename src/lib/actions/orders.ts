'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { updateOrderStatus as dbUpdateOrderStatus } from '@/lib/db/orders'
import { UpdateOrderStatusSchema } from '@/lib/validations'
import type { UpdateOrderStatusInput } from '@/lib/validations'
import type { OrderStatus } from '@/types'

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
  revalidateTag(`pedido:${orderId}`, {})

  return { ok: true }
}
