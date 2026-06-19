import { Resend } from 'resend'
import { env } from '@/env'
import { BRAND } from '@/lib/constants'
import type { Order } from '@/types'

// No ?? '' fallback — env now guarantees the key is present outside test.
// In test, Resend is mocked so the key value is never sent to the real client.
const resend = new Resend(env.RESEND_API_KEY)

// ── Types ────────────────────────────────────────────────────────────────────

interface SendEmailArgs {
  to: string
  subject: string
  text?: string
  html?: string
}

interface RenderResult {
  text: string
  html?: string
}

// ── Internal helpers ─────────────────────────────────────────────────────────

/**
 * renderEmail — single seam for template rendering.
 * Current impl: builds plain-text body; html is undefined (stub).
 * Future: drop HTML template here without touching any caller.
 */
function renderEmail(
  template: 'order-confirmation' | 'order-shipped',
  order: Order
): RenderResult {
  const shortId = order.id.slice(0, 8).toUpperCase()

  if (template === 'order-confirmation') {
    const itemLines = order.items
      .map((item) => `  - ${item.productName} (${item.variantName}) x${item.quantity}`)
      .join('\n')

    const text = [
      `Hola ${order.customer.name},`,
      '',
      `Tu pago para el pedido #${shortId} fue confirmado.`,
      '',
      'Productos:',
      itemLines,
      '',
      `Total: $${(order.total / 100).toFixed(2)}`,
      '',
      `Gracias por tu compra en ${BRAND.name}.`,
    ].join('\n')

    return { text }
  }

  // order-shipped
  const text = [
    `Hola ${order.customer.name},`,
    '',
    `Tu pedido #${shortId} fue enviado.`,
    '',
    `Pronto llegará a tu domicilio.`,
    '',
    `Gracias por tu confianza en ${BRAND.name}.`,
  ].join('\n')

  return { text }
}

// ── Exported API ─────────────────────────────────────────────────────────────

/**
 * sendEmail — centralized Resend wrapper.
 * Swallows all errors; callers observe { sent: boolean }, never exceptions.
 */
export async function sendEmail(args: SendEmailArgs): Promise<{ sent: boolean }> {
  try {
    // Resend requires exactly one content field (text, html, react, or template).
    // When html is provided it takes precedence; otherwise fall back to text.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
      from: env.RESEND_FROM_EMAIL as string,
      to: args.to,
      subject: args.subject,
    }
    if (args.html) {
      payload.html = args.html
    } else {
      payload.text = args.text
    }
    await resend.emails.send(payload)
    return { sent: true }
  } catch (err) {
    console.error('[email] send failed', err)
    return { sent: false }
  }
}

/**
 * sendOrderConfirmation — fire-and-forget; void contract preserved.
 * Webhook callers: `void sendOrderConfirmation(order).catch(...)` — unchanged.
 */
export async function sendOrderConfirmation(order: Order): Promise<void> {
  const shortId = order.id.slice(0, 8).toUpperCase()
  const { text, html } = renderEmail('order-confirmation', order)
  await sendEmail({
    to: order.customer.email,
    subject: `Tu pago para el pedido #${shortId} fue confirmado`,
    text,
    html,
  })
}

/**
 * sendOrderShipped — returns the send result so dispatchOrder can observe failure.
 */
export async function sendOrderShipped(order: Order): Promise<{ sent: boolean }> {
  const shortId = order.id.slice(0, 8).toUpperCase()
  const { text, html } = renderEmail('order-shipped', order)
  return sendEmail({
    to: order.customer.email,
    subject: `Tu pedido #${shortId} fue enviado`,
    text,
    html,
  })
}
