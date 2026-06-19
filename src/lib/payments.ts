import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'
import { env } from '@/env'
import type { Order } from '@/types'

// Appears on the buyer's card statement (max ~16 chars). Keep it recognizable as the brand.
const STATEMENT_DESCRIPTOR = 'AYLA'

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
    // Split the full name into name + surname; MP's fraud engine scores both.
    const [payerName, ...payerSurnameParts] = order.customer.name.trim().split(/\s+/)
    const payerSurname = payerSurnameParts.join(' ')

    const response = await preferenceClient.create({
      body: {
        external_reference: order.id,
        // Shows on the buyer's card statement; reduces chargebacks/unknown charges.
        statement_descriptor: STATEMENT_DESCRIPTOR,
        items: order.items.map((item) => ({
          id: item.variantId ?? item.id,
          title: `${item.productName} — ${item.variantName}`,
          description: `${item.productName} ${item.variantName}`.trim(),
          quantity: item.quantity,
          unit_price: item.unitPrice / 100, // centavos → pesos
          picture_url: item.imageUrl ?? undefined,
        })),
        payer: {
          name: payerName,
          surname: payerSurname || undefined,
          email: order.customer.email,
          phone: { number: order.customer.phone },
        },
        shipments: {
          cost: order.shippingCost / 100, // centavos → pesos
          mode: 'not_specified',
        },
        // No notification_url on purpose: a preference-level notification_url takes
        // precedence over the panel webhook and forces the legacy IPN format
        // (topic/resource), whose signature does not validate. Omitting it makes
        // MercadoPago use the panel webhook (modern data.id format, HMAC-validatable).
        back_urls: {
          success: `${env.NEXT_PUBLIC_SITE_URL}/checkout/confirmacion`,
          pending: `${env.NEXT_PUBLIC_SITE_URL}/checkout/confirmacion`,
          failure: `${env.NEXT_PUBLIC_SITE_URL}/checkout/confirmacion`,
        },
        auto_return: 'approved',
      },
      // Stable key so retries (network errors, double-clicks) don't create duplicate preferences.
      requestOptions: { idempotencyKey: order.id },
    })

    return {
      ok: true,
      data: {
        initPoint: response.init_point!,
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
