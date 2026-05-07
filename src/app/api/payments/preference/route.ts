import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getOrderById } from '@/lib/db/orders'
import { createPreference } from '@/lib/payments'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'

const bodySchema = z.object({
  orderId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkRateLimit(`payments:${ip}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { orderId } = parsed.data

  const order = await getOrderById(orderId)
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  if (order.status !== 'pending') {
    return NextResponse.json({ error: 'order_not_pending' }, { status: 409 })
  }

  const preferenceResult = await createPreference(order)
  if (!preferenceResult.ok) {
    return NextResponse.json(
      { error: preferenceResult.error },
      { status: 500 }
    )
  }

  const { initPoint, preferenceId } = preferenceResult.data

  const supabase = createAdminClient()
  const { error: updateError } = await supabase
    .from('orders')
    .update({ mp_preference_id: preferenceId })
    .eq('id', orderId)

  if (updateError) {
    console.error('[payments/preference] Failed to save preference ID:', updateError.message, { orderId, preferenceId })
  }

  return NextResponse.json({ initPoint, preferenceId }, { status: 200 })
}
