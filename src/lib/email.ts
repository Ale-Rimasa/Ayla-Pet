import { Resend } from 'resend'
import { env } from '@/env'
import { BRAND } from '@/lib/constants'
import type { Order } from '@/types'

const resend = new Resend(env.RESEND_API_KEY)

export async function sendOrderConfirmation(order: Order): Promise<void> {
  try {
    const itemLines = order.items
      .map((item) => `  - ${item.productName} (${item.variantName}) x${item.quantity}`)
      .join('\n')

    await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: order.customer.email,
      subject: `Confirmación de pedido #${order.id}`,
      text: [
        `Hola ${order.customer.name},`,
        '',
        `Tu pedido #${order.id} fue confirmado.`,
        '',
        'Productos:',
        itemLines,
        '',
        `Total: $${(order.total / 100).toFixed(2)}`,
        '',
        `Gracias por tu compra en ${BRAND.name}.`,
      ].join('\n'),
    })
  } catch (err) {
    console.error('[email] sendOrderConfirmation failed:', err)
  }
}
