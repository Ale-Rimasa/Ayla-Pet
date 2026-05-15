'use server'

import { z } from 'zod'
import { revalidatePath, revalidateTag } from 'next/cache'
import { headers } from 'next/headers'
import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { updateOrderStatus as dbUpdateOrderStatus, getOrderStatusById } from '@/lib/db/orders'
import { UpdateOrderStatusSchema } from '@/lib/validations'
import type { UpdateOrderStatusInput } from '@/lib/validations'
import type { OrderStatus } from '@/types'

const OrderIdSchema = z.string().uuid()

// ALLOWED_TRANSITIONS is the single source of truth for valid state transitions.
// The RPC update_order_status_atomic enforces only "fromStatus must match current" (race guard),
// NOT which transitions are legal — that logic lives here intentionally.
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

  const result = await dbUpdateOrderStatus(orderId, currentStatus, status, user.id)

  if (!result.ok) {
    return { ok: false, error: result.error }
  }

  revalidatePath('/admin/pedidos')
  revalidateTag(`pedido:${orderId}`, {})

  return { ok: true }
}

// No requireAdmin — UUID is the capability token (pre-cuentas phase, no customer auth).
// Risk accepted: UUID is unguessable; only status is exposed; no PII.
// Re-evaluate when customer accounts (fase 5) land.
// Rate-limited by IP to prevent enumeration/DoS on the service-role path.
export async function getOrderStatus(
  orderId: string
): Promise<{ status: OrderStatus } | null> {
  const parsed = OrderIdSchema.safeParse(orderId)
  if (!parsed.success) return null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data, error } = await supabase
      .from('orders')
      .select('status')
      .eq('id', parsed.data)
      .maybeSingle()

    if (error || !data) return null
    return { status: (data as { status: OrderStatus }).status }
  }

  // Rate-limit by IP — public endpoint; UUID is capability token but still DoS-able
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const allowed = await checkRateLimit(`order-status:${ip}`, 30, 60_000)
  if (!allowed) return null

  // Narrow query — fetches only status, no PII fields exposed.
  return getOrderStatusById(parsed.data)
}
