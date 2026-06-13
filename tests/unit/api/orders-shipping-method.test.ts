import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [{
          id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          name: 'S',
          price: 500000,
          products: { name: 'Chapita', images: [] },
        }],
        error: null,
      }),
    }),
  }),
}))

vi.mock('@/lib/shipping-package', () => ({
  resolveShippingPackages: vi.fn().mockResolvedValue({
    ok: true,
    packages: [{ weightG: 100, heightMm: 5, widthMm: 60, lengthMm: 40 }],
  }),
  packagesToSnapshots: vi.fn().mockReturnValue([]),
}))

vi.mock('@/lib/correo-argentino', () => ({
  getCorreoArgentinoQuote: vi.fn().mockResolvedValue({
    domicilio: {
      clasico: { priceCentavos: 800000, diasMin: '2', diasMax: '5' },
      expreso: { priceCentavos: 1100000, diasMin: '1', diasMax: '2' },
    },
    sucursal: {
      clasico: { priceCentavos: 600000, diasMin: '1', diasMax: '3' },
      expreso: null,
    },
    rateSource: 'mock',
    quotedAt: '',
  }),
}))

vi.mock('@/lib/db/orders', () => ({
  createOrder: vi.fn().mockResolvedValue({ ok: true, data: { orderId: 'order-uuid-1' } }),
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VARIANT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const basePayload = {
  customer: { name: 'Ana García', email: 'ana@test.com', phone: '1112345678' },
  shipping: { street: 'Corrientes 1', city: 'CABA', province: 'AR-C', postalCode: '1043' },
  items: [{ variantId: VARIANT_ID, quantity: 1 }],
}

// ─── Tests ────────────────────────────────────────────────────────────────────

// ─── Task 2.2 RED: bodySchema engravingText validation ───────────────────────

describe('POST /api/orders — engravingText bodySchema validation', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('accepts engravingText: "Bobi" and passes it to createOrder', async () => {
    const { createOrder } = await import('@/lib/db/orders')
    const { POST } = await import('@/app/api/orders/route')

    await POST(makeRequest({
      ...basePayload,
      shippingMethod: 'correo-argentino-domicilio',
      engravingText: 'Bobi',
    }) as any)

    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ engravingText: 'Bobi' })
    )
  })

  it('accepts request without engravingText field', async () => {
    const { POST } = await import('@/app/api/orders/route')

    const res = await POST(makeRequest({
      ...basePayload,
      shippingMethod: 'correo-argentino-domicilio',
    }) as any)

    expect(res.status).not.toBe(400)
  })

  it('rejects engravingText longer than 20 characters with 400', async () => {
    const { POST } = await import('@/app/api/orders/route')

    const res = await POST(makeRequest({
      ...basePayload,
      shippingMethod: 'correo-argentino-domicilio',
      engravingText: 'A'.repeat(21),
    }) as any)

    expect(res.status).toBe(400)
  })
})

describe('POST /api/orders — correo-argentino-domicilio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Sin esto el route saltea la cotización (modo default 'mock' en
    // isShippingQuoteAvailable) y getCorreoArgentinoQuote nunca se llama.
    vi.stubEnv('CORREO_ARGENTINO_MODE', 'official')
  })

  afterEach(() => { vi.unstubAllEnvs() })

  it('llama getCorreoArgentinoQuote cuando shippingMethod=correo-argentino-domicilio', async () => {
    const { getCorreoArgentinoQuote } = await import('@/lib/correo-argentino')
    const { POST } = await import('@/app/api/orders/route')

    await POST(makeRequest({
      ...basePayload,
      shippingMethod: 'correo-argentino-domicilio',
      clientShippingCost: 800000,
    }) as any)

    expect(getCorreoArgentinoQuote).toHaveBeenCalledWith(
      expect.objectContaining({ destinationProvincia: 'AR-C' })
    )
  })

  it('sin productType (default CP) usa quote.domicilio.clasico como costo validado', async () => {
    const { createOrder } = await import('@/lib/db/orders')
    const { POST } = await import('@/app/api/orders/route')

    await POST(makeRequest({
      ...basePayload,
      shippingMethod: 'correo-argentino-domicilio',
      clientShippingCost: 800000,
    }) as any)

    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ shippingCost: 800000 })
    )
  })

  it('sin productType (default CP) usa quote.sucursal.clasico como costo validado', async () => {
    const { createOrder } = await import('@/lib/db/orders')
    const { POST } = await import('@/app/api/orders/route')

    await POST(makeRequest({
      ...basePayload,
      shippingMethod: 'correo-argentino-sucursal',
      clientShippingCost: 600000,
    }) as any)

    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ shippingCost: 600000 })
    )
  })

  it('productType=EP + domicilio usa quote.domicilio.expreso como costo validado', async () => {
    const { createOrder } = await import('@/lib/db/orders')
    const { POST } = await import('@/app/api/orders/route')

    await POST(makeRequest({
      ...basePayload,
      shippingMethod: 'correo-argentino-domicilio',
      productType: 'EP',
      clientShippingCost: 1100000,
    }) as any)

    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ shippingCost: 1100000 })
    )
  })

  it('retorna 422 shipping_option_unavailable cuando la combinación elegida es null y no crea la orden', async () => {
    const { createOrder } = await import('@/lib/db/orders')
    const { POST } = await import('@/app/api/orders/route')

    const res = await POST(makeRequest({
      ...basePayload,
      shippingMethod: 'correo-argentino-sucursal',
      productType: 'EP', // quote.sucursal.expreso === null en el mock
      clientShippingCost: 999999,
    }) as any)

    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toBe('shipping_option_unavailable')
    expect(createOrder).not.toHaveBeenCalled()
  })

  it('retorna 409 shipping_price_changed con el costo derivado del lookup bidimensional', async () => {
    const { createOrder } = await import('@/lib/db/orders')
    const { POST } = await import('@/app/api/orders/route')

    const res = await POST(makeRequest({
      ...basePayload,
      shippingMethod: 'correo-argentino-sucursal',
      productType: 'CP',
      clientShippingCost: 999999, // distinto de quote.sucursal.clasico.priceCentavos (600000)
    }) as any)

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('shipping_price_changed')
    expect(body.newShippingCost).toBe(600000)
    expect(body.newTotal).toBe(500000 + 600000)
    expect(createOrder).not.toHaveBeenCalled()
  })

  it('retorna 409 cuando el precio CA domicilio (CP, default) cambió', async () => {
    const { POST } = await import('@/app/api/orders/route')

    const res = await POST(makeRequest({
      ...basePayload,
      shippingMethod: 'correo-argentino-domicilio',
      clientShippingCost: 999999, // distinto de 800000
    }) as any)

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('shipping_price_changed')
    expect(body.newShippingCost).toBe(800000)
  })

  it('pasa observations como notes a createOrder', async () => {
    const { createOrder } = await import('@/lib/db/orders')
    const { POST } = await import('@/app/api/orders/route')

    await POST(makeRequest({
      ...basePayload,
      shippingMethod: 'correo-argentino-domicilio',
      clientShippingCost: 800000,
      observations: 'Casa con rejas negras',
    }) as any)

    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ notes: 'Casa con rejas negras' })
    )
  })
})
