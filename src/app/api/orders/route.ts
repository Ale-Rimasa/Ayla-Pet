import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createOrder } from '@/lib/db/orders'
import { checkRateLimit } from '@/lib/rate-limit'
import { resolveShippingPackages, packagesToSnapshots } from '@/lib/shipping-package'
import { getShippingQuote, AndreaniUnavailableError } from '@/lib/andreani'
import { getCorreoArgentinoQuote } from '@/lib/correo-argentino'
import { SHIPPING_METHODS } from '@/types/shipping'
import type { CreateOrderItemPayload } from '@/types'

function isAndreaniEnabled(): boolean {
  if (process.env.NODE_ENV !== 'production') return true
  return process.env.ANDREANI_ENABLED === 'true'
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const orderItemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1),
})

const bodySchema = z.object({
  customer: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
  }),
  shipping: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    province: z.string().min(1),
    postalCode: z.string().min(1),
  }),
  items: z.array(orderItemSchema).min(1),
  shippingMethod: z.enum(SHIPPING_METHODS),
  // Opcional: precio visto por el cliente. Solo usado para detectar cambio de precio.
  // El servidor SIEMPRE calcula el costo definitivo — este valor nunca determina el total.
  clientShippingCost: z.number().int().min(0).optional(),
  notes: z.string().optional(),
  observations: z.string().max(80).optional(),
})

type VariantWithProduct = {
  id: string
  name: string
  price: number
  products: { name: string; images: string[] | null } | null
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // 1. Rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!await checkRateLimit(`orders:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // 3. Parse body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { customer, shipping, items, shippingMethod, clientShippingCost, notes, observations } = parsed.data

  // 4. Leer precios de variantes desde DB (nunca del cliente)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const variantIds = items.map((item) => item.variantId)
  const { data: variants, error: variantError } = await supabase
    .from('product_variants')
    .select('id, name, price, products!inner(name, images)')
    .in('id', variantIds)

  if (variantError) {
    return NextResponse.json({ error: 'Failed to fetch variants' }, { status: 500 })
  }

  const variantMap = new Map(
    (variants as unknown as VariantWithProduct[])?.map((v) => [v.id, v]) ?? []
  )

  for (const item of items) {
    if (!variantMap.has(item.variantId)) {
      return NextResponse.json({ error: `Variant not found: ${item.variantId}` }, { status: 400 })
    }
  }

  // 5. Calcular subtotal server-side
  const orderItems: CreateOrderItemPayload[] = items.map((item) => {
    const variant = variantMap.get(item.variantId)!
    const product = variant.products
    const unitPrice = variant.price
    const subtotal = unitPrice * item.quantity
    const imageUrl =
      Array.isArray(product?.images) && product.images.length > 0
        ? product.images[0]
        : null

    return {
      variantId: item.variantId,
      productName: product?.name ?? '',
      variantName: variant.name,
      unitPrice,
      quantity: item.quantity,
      subtotal,
      imageUrl,
    }
  })

  const subtotal = orderItems.reduce((acc, item) => acc + item.subtotal, 0)

  // 6. Resolver paquetes desde DB y cotizar con Andreani (server-side)
  const resolved = await resolveShippingPackages(
    items.map((i) => ({ variantId: i.variantId, quantity: i.quantity }))
  )

  if (!resolved.ok) {
    return NextResponse.json(
      { error: 'unresolvable_package', reason: resolved.reason },
      { status: 422 }
    )
  }

  // Valor declarado = subtotal calculado server-side
  const packageData = resolved.packages.map((p) => ({
    weightG: p.weightG,
    heightMm: p.heightMm,
    widthMm: p.widthMm,
    lengthMm: p.lengthMm,
  }))

  if (shippingMethod === 'andreani-domicilio' && !isAndreaniEnabled()) {
    return NextResponse.json({ error: 'andreani_not_available' }, { status: 400 })
  }

  let validatedShippingCost: number
  try {
    if (shippingMethod === 'correo-argentino-domicilio' || shippingMethod === 'correo-argentino-sucursal') {
      const quote = await getCorreoArgentinoQuote({
        destinationCp: shipping.postalCode,
        destinationProvincia: shipping.province,
        packages: packageData,
      })
      validatedShippingCost = shippingMethod === 'correo-argentino-domicilio'
        ? quote.aDomicilioCentavos
        : quote.aSucursalCentavos
    } else {
      const quote = await getShippingQuote({
        destinationCp: shipping.postalCode,
        packages: packageData,
        declaredValueCentavos: subtotal,
        bypassCache: true,
      })
      validatedShippingCost = quote.price
    }
  } catch (err) {
    if (err instanceof AndreaniUnavailableError) {
      return NextResponse.json({ error: 'andreani_unavailable' }, { status: 503 })
    }
    console.error('[POST /api/orders] getShippingQuote error', err)
    return NextResponse.json({ error: 'shipping_unavailable' }, { status: 503 })
  }

  const total = subtotal + validatedShippingCost

  // 7. Detectar cambio de precio (el cliente envía su precio para comparación)
  //    Si difieren → 409. El cliente muestra el nuevo precio y pide confirmación.
  //    La orden NO se crea hasta que el cliente confirme.
  if (
    clientShippingCost !== undefined &&
    clientShippingCost !== validatedShippingCost
  ) {
    return NextResponse.json(
      {
        error: 'shipping_price_changed',
        newShippingCost: validatedShippingCost,
        newTotal: total,
      },
      { status: 409 }
    )
  }

  // 8. Crear orden con costo validado server-side + snapshot de bultos
  const packageSnapshots = packagesToSnapshots(resolved.packages)

  const result = await createOrder({
    userId: user?.id ?? null,
    customer,
    shipping,
    items: orderItems,
    subtotal,
    shippingCost: validatedShippingCost,
    total,
    notes: observations ?? notes,
    shippingPackages: packageSnapshots,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ orderId: result.data!.orderId }, { status: 201 })
}
