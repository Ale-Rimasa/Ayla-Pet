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
  const paymentId = new URL(request.url).searchParams.get('id') ?? ''

  if (!verifyMPSignature(xSignature, xRequestId, paymentId, env.MP_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
  }

  await processMPWebhook(paymentId)

  return ok200()
}
