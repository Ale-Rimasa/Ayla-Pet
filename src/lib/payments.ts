import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'
import { env } from '@/env'
import type { Order } from '@/types'

function getMpClient() {
  if (!env.MP_ACCESS_TOKEN) throw new Error('MP_ACCESS_TOKEN is not configured')
  return new MercadoPagoConfig({ accessToken: env.MP_ACCESS_TOKEN })
}

export async function createPreference(
  order: Order
): Promise<
  | { ok: true; data: { initPoint: string; preferenceId: string } }
  | { ok: false; error: string }
> {
  try {
    const preferenceClient = new Preference(getMpClient())
    const response = await preferenceClient.create({
      body: {
        external_reference: order.id,
        items: order.items.map((item) => ({
          id: item.variantId ?? item.id,
          title: `${item.productName} — ${item.variantName}`,
          quantity: item.quantity,
          unit_price: item.unitPrice / 100, // centavos → pesos
          picture_url: item.imageUrl ?? undefined,
        })),
        payer: {
          name: order.customer.name,
          email: order.customer.email,
          phone: { number: order.customer.phone },
        },
        notification_url: `${env.NEXT_PUBLIC_SITE_URL}/api/webhooks/mercadopago`,
        back_urls: {
          success: `${env.NEXT_PUBLIC_SITE_URL}/checkout/confirmacion`,
          pending: `${env.NEXT_PUBLIC_SITE_URL}/checkout/confirmacion`,
          failure: `${env.NEXT_PUBLIC_SITE_URL}/checkout/confirmacion`,
        },
        auto_return: 'approved',
      },
    })

    const isTest = env.MP_ACCESS_TOKEN?.startsWith('TEST-')
    const initPoint = isTest
      ? (response.sandbox_init_point ?? response.init_point!)
      : response.init_point!

    return {
      ok: true,
      data: {
        initPoint,
        preferenceId: response.id!,
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message }
  }
}

export async function fetchPayment(paymentId: string): Promise<
  | { ok: true; data: { status: string; amount: number; orderId: string } }
  | { ok: false; error: string }
> {
  try {
    const paymentClient = new Payment(getMpClient())
    const response = await paymentClient.get({ id: paymentId })

    return {
      ok: true,
      data: {
        status: response.status ?? 'unknown',
        amount: Math.round((response.transaction_amount ?? 0) * 100), // pesos → centavos
        orderId: response.external_reference ?? '',
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message }
  }
}
