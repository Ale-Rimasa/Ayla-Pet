import { createHmac, timingSafeEqual } from 'crypto'
import { fetchPayment } from '@/lib/payments'
import { recordMPPayment } from '@/lib/db/payments'
import { getOrderById, updateOrderStatus } from '@/lib/db/orders'
import { decrementStock } from '@/lib/db/stock'
import { sendOrderConfirmation } from '@/lib/email'

export function verifyMPSignature(
  xSignature: string,
  xRequestId: string,
  paymentId: string,
  secret: string
): boolean {
  const parts = Object.fromEntries(
    xSignature.split(',').map((part) => {
      const [k, v] = part.split('=')
      return [k.trim(), v?.trim()]
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

export async function processMPWebhook(paymentId: string): Promise<void> {
  const paymentResult = await fetchPayment(paymentId)
  if (!paymentResult.ok) {
    console.error('[webhook] Failed to fetch payment:', paymentResult.error)
    return
  }

  const { status: mpStatus, amount, orderId } = paymentResult.data

  console.info('[webhook] Payment received', { paymentId, mpStatus, orderId })

  const recordResult = await recordMPPayment({ mpPaymentId: paymentId, orderId, status: mpStatus, amount })

  if (!recordResult.ok) {
    if (recordResult.isDuplicate) return
    console.error('[webhook] Payment record error:', recordResult.error)
    return
  }

  if (mpStatus === 'rejected') {
    const order = await getOrderById(orderId)
    if (order && order.status === 'pending') {
      const cancelResult = await updateOrderStatus(orderId, order.status, 'cancelled')
      if (!cancelResult.ok) {
        console.error('[webhook] Failed to cancel rejected order:', { orderId, error: cancelResult.error })
      }
    }
    return
  }

  if (mpStatus !== 'approved') return

  const order = await getOrderById(orderId)
  if (!order) {
    console.error('[webhook] Order not found:', orderId)
    return
  }

  const missingVariant = order.items.some((item) => !item.variantId)
  if (missingVariant) {
    console.error('[webhook] Order has items without variantId:', orderId)
    await updateOrderStatus(orderId, order.status, 'cancelled')
    return
  }

  const stockResult = await decrementStock(
    order.items.map((item) => ({ variantId: item.variantId as string, quantity: item.quantity }))
  )

  if (!stockResult.ok) {
    // ALERT: payment approved but stock decrement failed (oversell).
    // The order is cancelled automatically, but the customer was charged.
    // Manual action required: issue a refund via MercadoPago dashboard.
    console.error('[webhook][ALERT] OVERSELL — payment approved but stock insufficient. MANUAL REFUND REQUIRED.', {
      orderId,
      paymentId,
      error: stockResult.error,
    })
    const cancelResult = await updateOrderStatus(orderId, order.status, 'cancelled')
    if (!cancelResult.ok) {
      console.error('[webhook][ALERT] Failed to cancel oversold order:', { orderId, error: cancelResult.error })
    }
    return
  }

  await updateOrderStatus(orderId, order.status, 'paid')

  // Must await: in serverless the instance can be frozen right after the response
  // is sent, so a fire-and-forget send may never reach Resend. sendOrderConfirmation
  // swallows its own errors, but keep a guard so a rejection can never bubble up.
  await sendOrderConfirmation(order).catch((err) =>
    console.error('[webhook][email] Failed to send order confirmation:', err)
  )
}
