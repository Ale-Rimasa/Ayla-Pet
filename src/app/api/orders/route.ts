import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createOrder } from '@/lib/db/orders'
import { checkRateLimit } from '@/lib/rate-limit'
import { SHIPPING_COSTS } from '@/lib/constants'
import type { CreateOrderItemPayload } from '@/types'

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
  shippingMethod: z.enum(['standard', 'express', 'pickup']),
  notes: z.string().optional(),
  clientTotal: z.number().int().min(0).optional(),
})

type VariantWithProduct = {
  id: string
  name: string
  price: number
  products: { name: string; images: string[] | null } | null
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!await checkRateLimit(`orders:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

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

  const { customer, shipping, items, shippingMethod, notes } = parsed.data

  const shippingCost = SHIPPING_COSTS[shippingMethod]

  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
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
      return NextResponse.json(
        { error: `Variant not found: ${item.variantId}` },
        { status: 400 }
      )
    }
  }

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
  const total = subtotal + shippingCost

  if (parsed.data.clientTotal !== undefined && parsed.data.clientTotal !== total) {
    return NextResponse.json({ error: 'price_mismatch' }, { status: 400 })
  }

  const result = await createOrder({
    userId: session?.user.id ?? null,
    customer,
    shipping,
    items: orderItems,
    subtotal,
    shippingCost,
    total,
    notes,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ orderId: result.data!.orderId }, { status: 201 })
}
