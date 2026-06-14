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

const AGENCY_SNAPSHOT = {
  code: 'B-0123',
  name: 'Sucursal La Plata Centro',
  address: 'Calle 7 1234',
  locality: 'La Plata',
  city: 'La Plata',
  province: 'Buenos Aires',
  postalCode: '1900',
}

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

describe('POST /api/orders — agencyCode / agencySnapshot (Fase 2: sucursal de destino)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('CORREO_ARGENTINO_MODE', 'official')
  })

  afterEach(() => { vi.unstubAllEnvs() })

  it('sucursal con agencyCode y agencySnapshot válidos: createOrder recibe deliveredType=S, productType, agencyCode y agencySnapshot intactos', async () => {
    const { createOrder } = await import('@/lib/db/orders')
    const { POST } = await import('@/app/api/orders/route')

    const res = await POST(makeRequest({
      ...basePayload,
      shippingMethod: 'correo-argentino-sucursal',
      productType: 'CP',
      clientShippingCost: 600000,
      agencyCode: AGENCY_SNAPSHOT.code,
      agencySnapshot: AGENCY_SNAPSHOT,
    }) as any)

    expect(res.status).toBe(201)
    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveredType: 'S',
        productType: 'CP',
        agencyCode: AGENCY_SNAPSHOT.code,
        agencySnapshot: AGENCY_SNAPSHOT,
      })
    )
  })

  it('domicilio sin agencyCode/agencySnapshot: createOrder recibe deliveredType=D, agencyCode=null, agencySnapshot=null', async () => {
    const { createOrder } = await import('@/lib/db/orders')
    const { POST } = await import('@/app/api/orders/route')

    const res = await POST(makeRequest({
      ...basePayload,
      shippingMethod: 'correo-argentino-domicilio',
      clientShippingCost: 800000,
    }) as any)

    expect(res.status).toBe(201)
    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveredType: 'D',
        agencyCode: null,
        agencySnapshot: null,
      })
    )
  })

  it('domicilio con agencyCode/agencySnapshot enviados por el cliente: el server los ignora y fuerza null', async () => {
    const { createOrder } = await import('@/lib/db/orders')
    const { POST } = await import('@/app/api/orders/route')

    const res = await POST(makeRequest({
      ...basePayload,
      shippingMethod: 'correo-argentino-domicilio',
      clientShippingCost: 800000,
      agencyCode: AGENCY_SNAPSHOT.code,
      agencySnapshot: AGENCY_SNAPSHOT,
    }) as any)

    expect(res.status).toBe(201)
    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveredType: 'D',
        agencyCode: null,
        agencySnapshot: null,
      })
    )
  })

  it('sucursal con agencyCode ausente: 400 con issue en agencyCode, sin crear orden', async () => {
    const { createOrder } = await import('@/lib/db/orders')
    const { POST } = await import('@/app/api/orders/route')

    const res = await POST(makeRequest({
      ...basePayload,
      shippingMethod: 'correo-argentino-sucursal',
      productType: 'CP',
      clientShippingCost: 600000,
    }) as any)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.details?.fieldErrors?.agencyCode).toBeDefined()
    expect(createOrder).not.toHaveBeenCalled()
  })

  it('sucursal con agencyCode vacío: 400, sin crear orden', async () => {
    const { createOrder } = await import('@/lib/db/orders')
    const { POST } = await import('@/app/api/orders/route')

    const res = await POST(makeRequest({
      ...basePayload,
      shippingMethod: 'correo-argentino-sucursal',
      productType: 'CP',
      clientShippingCost: 600000,
      agencyCode: '',
      agencySnapshot: AGENCY_SNAPSHOT,
    }) as any)

    expect(res.status).toBe(400)
    expect(createOrder).not.toHaveBeenCalled()
  })

  it('regresión: 409 shipping_price_changed sigue intacto en sucursal con agencyCode/agencySnapshot válidos', async () => {
    const { createOrder } = await import('@/lib/db/orders')
    const { POST } = await import('@/app/api/orders/route')

    const res = await POST(makeRequest({
      ...basePayload,
      shippingMethod: 'correo-argentino-sucursal',
      productType: 'CP',
      clientShippingCost: 999999, // distinto de quote.sucursal.clasico (600000)
      agencyCode: AGENCY_SNAPSHOT.code,
      agencySnapshot: AGENCY_SNAPSHOT,
    }) as any)

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('shipping_price_changed')
    expect(createOrder).not.toHaveBeenCalled()
  })
})
