'use server'

import { z } from 'zod'
import { revalidatePath, revalidateTag } from 'next/cache'
import { headers } from 'next/headers'
import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import {
  updateOrderStatus as dbUpdateOrderStatus,
  getOrderById,
  getOrderStatusById,
} from '@/lib/db/orders'
import { sendOrderShipped } from '@/lib/email'
import { UpdateOrderStatusSchema } from '@/lib/validations'
import type { UpdateOrderStatusInput } from '@/lib/validations'
import type { OrderStatus } from '@/types'

// ── dispatchOrder ─────────────────────────────────────────────────────────────

export type DispatchResult =
  | { ok: true; emailSent: boolean }
  | { ok: false; error: 'invalid-input' | 'not-found' | 'invalid-transition' | 'transition-failed' | 'unauthorized' }

/**
 * dispatchOrder — marks a processing order as shipped and sends the customer email.
 *
 * Control flow (order matters):
 *  1. Auth gate — requireAdmin throws on non-admin (S2)
 *  2. Input validation — Zod uuid check (S3)
 *  3. Load full order — needed for existence check + status gate + email payload (S4)
 *  4. Status gate — only 'processing' may transition (S5)
 *  5. Atomic DB transition FIRST — source of truth; race-guarded RPC (S6/S8)
 *  6. Email AFTER confirmed transition, awaited so result is observable (S7)
 *  7. Cache revalidation regardless of email outcome
 *  8. Return result
 */
export async function dispatchOrder(orderId: string): Promise<DispatchResult> {
  // Step 1 — auth (throws on non-admin, consistent with updateOrderStatus)
  const user = await requireAdmin()

  // Step 2 — input validation
  const parsed = OrderIdSchema.safeParse(orderId)
  if (!parsed.success) {
    return { ok: false, error: 'invalid-input' }
  }

  // Step 3 — load full order (single fetch covers existence + status + email payload)
  const order = await getOrderById(parsed.data)
  if (!order) {
    return { ok: false, error: 'not-found' }
  }

  // Step 4 — status gate (hard requirement: must be processing, no shortcuts)
  if (order.status !== 'processing') {
    return { ok: false, error: 'invalid-transition' }
  }

  // Step 5 — atomic transition (source of truth; returns { ok } never throws)
  const result = await dbUpdateOrderStatus(parsed.data, 'processing', 'shipped', user.id)
  if (!result.ok) {
    return { ok: false, error: 'transition-failed' }
  }

  // Step 6 — email after confirmed transition, awaited so result is observable
  const { sent } = await sendOrderShipped(order)

  // Step 7 — cache revalidation (regardless of email outcome)
  revalidatePath('/admin/pedidos')
  revalidateTag(`pedido:${parsed.data}`, {})

  // Step 8 — return result
  return { ok: true, emailSent: sent }
}

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
