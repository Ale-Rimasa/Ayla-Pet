import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/env'
import { checkRateLimit } from '@/lib/rate-limit'
import { verifyMPSignature, processMPWebhook } from '@/lib/webhooks/mercadopago'

export async function POST(request: NextRequest) {
  const ok200 = () => NextResponse.json({ received: true }, { status: 200 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!await checkRateLimit(`webhook:${ip}`, 120, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const xSignature = request.headers.get('x-signature') ?? ''
  const xRequestId = request.headers.get('x-request-id') ?? ''

  // Real webhooks send ?id= in the URL; the simulate tool sends it in the body as data.id
  let paymentId = new URL(request.url).searchParams.get('id') ?? ''
  if (!paymentId) {
    try {
      const body = await request.json() as { data?: { id?: unknown } }
      paymentId = String(body?.data?.id ?? '')
    } catch {
      // paymentId stays empty
    }
  }

  if (!verifyMPSignature(xSignature, xRequestId, paymentId, env.MP_WEBHOOK_SECRET ?? '')) {
    console.error('[webhook] Signature verification failed', {
      hasSignature: !!xSignature,
      hasRequestId: !!xRequestId,
      hasPaymentId: !!paymentId,
      hasSecret: !!env.MP_WEBHOOK_SECRET,
      signaturePrefix: xSignature.slice(0, 20),
    })
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
  }

  await processMPWebhook(paymentId)

  return ok200()
}
