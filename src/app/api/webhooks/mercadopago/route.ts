import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/env'
import { checkRateLimit } from '@/lib/rate-limit'
import { verifyMPSignature, processMPWebhook } from '@/lib/webhooks/mercadopago'

export async function POST(request: NextRequest) {
  const ok200 = () => NextResponse.json({ received: true }, { status: 200 })

  // Without a secret, HMAC-SHA256(manifest, '') is forgeable by anyone — reject everything
  if (!env.MP_WEBHOOK_SECRET) {
    console.error('[webhook] MP_WEBHOOK_SECRET not configured — rejecting all webhooks')
    return NextResponse.json({ error: 'misconfigured' }, { status: 500 })
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!await checkRateLimit(`webhook:${ip}`, 120, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const xSignature = request.headers.get('x-signature') ?? ''
  const xRequestId = request.headers.get('x-request-id') ?? ''

  // Always read the body first: MP signs with data.id (payment ID), while ?id= in the URL
  // can be the notification ID (a different integer in some webhook formats).
  let body: { data?: { id?: unknown } } = {}
  try {
    body = await request.json() as { data?: { id?: unknown } }
  } catch { /* body stays empty */ }

  const url = new URL(request.url)
  const bodyPaymentId = String(body?.data?.id ?? '')
  const urlPaymentId = url.searchParams.get('id') ?? ''
  const paymentId = bodyPaymentId || urlPaymentId

  // TEMP DEBUG — diagnosing signature mismatch. No secrets logged. Remove after.
  console.info('[webhook][debug] incoming', {
    query: Object.fromEntries(url.searchParams),
    body: JSON.stringify(body).slice(0, 300),
    xRequestId,
    xSignature,
    bodyPaymentId,
    urlPaymentId,
    paymentIdUsed: paymentId,
  })

  if (!verifyMPSignature(xSignature, xRequestId, paymentId, env.MP_WEBHOOK_SECRET)) {
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
