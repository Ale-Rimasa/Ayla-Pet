import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { env } from '@/env'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchPayment } from '@/lib/payments'
import { decrementStock } from '@/lib/db/stock'
import { updateOrderStatus, getOrderById } from '@/lib/db/orders'
import { sendOrderConfirmation } from '@/lib/email'
import { checkRateLimit } from '@/lib/rate-limit'

function verifySignature(
  xSignature: string,
  xRequestId: string,
  paymentId: string,
  secret: string
): boolean {
  const parts = Object.fromEntries(
    xSignature.split(',').map((part) => {
      const [k, v] = part.split('=')
      return [k, v]
    })
  )
  const ts = parts['ts']
  const v1 = parts['v1']

  if (!ts || !v1) return false

  const manifest = `id:${paymentId};request-id:${xRequestId};ts:${ts};`
  const expected = createHmac('sha256', secret).update(manifest).digest('hex')

  try {
    return timingSafeEqual(Buffer.from(v1, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  const ok200 = () => NextResponse.json({ received: true }, { status: 200 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkRateLimit(`webhook:${ip}`, 120, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const xSignature = request.headers.get('x-signature') ?? ''
  const xRequestId = request.headers.get('x-request-id') ?? ''
  const url = new URL(request.url)
  const paymentId = url.searchParams.get('id') ?? ''

  if (!verifySignature(xSignature, xRequestId, paymentId, env.MP_WEBHOOK_SECRET)) {
    console.warn('[webhook][security] Invalid signature', {
      requestId: xRequestId || undefined,
      paymentId: paymentId || undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    })
    return ok200()
  }

  const paymentResult = await fetchPayment(paymentId)
  if (!paymentResult.ok) {
    console.error('[webhook] Failed to fetch payment:', paymentResult.error)
    return ok200()
  }

  const { status: mpStatus, amount, orderId } = paymentResult.data

  const supabase = createAdminClient()
  const { data: insertedRows, error: insertError } = await supabase
    .from('payments')
    .insert({ mp_payment_id: paymentId, order_id: orderId, status: mpStatus, amount })
    .select()

  if (insertError) {
    if (insertError.code === '23505') return ok200()
    console.error('[webhook] Insert error:', insertError.message)
    return ok200()
  }

  if (!insertedRows || insertedRows.length === 0) {
    return ok200()
  }

  if (mpStatus !== 'approved') {
    return ok200()
  }

  const order = await getOrderById(orderId)
  if (!order) {
    console.error('[webhook] Order not found:', orderId)
    return ok200()
  }

  const stockResult = await decrementStock(
    order.items.map((item) => ({
      variantId: item.variantId ?? '',
      quantity: item.quantity,
    }))
  )

  if (!stockResult.ok) {
    console.error('[webhook] Stock decrement failed:', stockResult.error)
    await updateOrderStatus(orderId, 'cancelled')
    return ok200()
  }

  await updateOrderStatus(orderId, 'paid')

  void sendOrderConfirmation(order)

  return ok200()
}
