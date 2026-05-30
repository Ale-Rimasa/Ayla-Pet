import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveShippingPackages } from '@/lib/shipping-package'
import { getShippingQuote, buildCacheKey } from '@/lib/andreani'
import { getCorreoArgentinoQuote } from '@/lib/correo-argentino'
import { checkRateLimit } from '@/lib/rate-limit'

// CP argentino: 4–8 dígitos
const CP_REGEX = /^\d{4,8}$/

// Límites de seguridad
const MAX_ITEMS = 20
const MAX_PACKAGES = 50

const bodySchema = z.object({
  cp: z.string().regex(CP_REGEX, 'Código postal inválido (4–8 dígitos)'),
  provincia: z.string().regex(/^AR-[A-Z]+$/, 'Provincia inválida (formato: AR-X)').optional(),
  items: z
    .array(
      z.object({
        variantId: z.string().uuid('variantId debe ser un UUID válido'),
        quantity: z.number().int().min(1).max(100),
      }).strict()
    )
    .min(1, 'Se requiere al menos un ítem')
    .max(MAX_ITEMS, `Máximo ${MAX_ITEMS} ítems por cotización`),
}).strict() // Cualquier campo extra del cliente (weight, height, etc.) es rechazado

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!await checkRateLimit(`quote:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validación fallida', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { cp, provincia, items } = parsed.data
  // Nota: weight, height, width, length del cliente nunca llegan aquí —
  // el schema strict los ignora y los datos reales vienen de DB.

  // Resolver paquetes desde DB (service role, no del cliente)
  let resolved: Awaited<ReturnType<typeof resolveShippingPackages>>
  try {
    resolved = await resolveShippingPackages(items)
  } catch (err) {
    console.error('[api/shipping/quote] resolveShippingPackages error', err)
    return NextResponse.json({ error: 'Error al resolver embalajes' }, { status: 500 })
  }

  if (!resolved.ok) {
    return NextResponse.json(
      { error: 'shipping_unresolvable', reason: resolved.reason },
      { status: 422 }
    )
  }

  if (resolved.packages.length > MAX_PACKAGES) {
    return NextResponse.json(
      { error: `Máximo ${MAX_PACKAGES} bultos por cotización` },
      { status: 422 }
    )
  }

  // Valor declarado: se usará suma de precios de variantes cuando esté disponible.
  // Por ahora se usa un valor declarado simbólico para el mock.
  // TODO: cuando Andreani real esté activo, recibir o calcular valor declarado
  // pasando variantIds y buscando precios en DB.
  const declaredValueCentavos = 0 // placeholder para mock

  const packageData = resolved.packages.map((p) => ({
    weightG: p.weightG,
    heightMm: p.heightMm,
    widthMm: p.widthMm,
    lengthMm: p.lengthMm,
  }))

  const cacheKey = buildCacheKey({ destinationCp: cp, packages: packageData, declaredValueCentavos })

  try {
    // Next.js fetch cache con TTL de 5 minutos para producto/checkout.
    // bypassCache lo usa internamente getShippingQuote cuando se llama desde orders.
    const andreani = await getShippingQuote({
      destinationCp: cp,
      packages: packageData,
      declaredValueCentavos,
    })

    const correoArgentino = provincia
      ? await getCorreoArgentinoQuote({
          destinationCp: cp,
          destinationProvincia: provincia,
          packages: packageData,
        })
      : undefined

    return NextResponse.json(
      { andreani, ...(correoArgentino ? { correoArgentino } : {}), cacheKey },
      {
        headers: {
          'Cache-Control': 'private, max-age=300',
        },
      }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[api/shipping/quote]', message)
    return NextResponse.json(
      { error: 'No se pudo obtener la cotización de envío' },
      { status: 502 }
    )
  }
}
