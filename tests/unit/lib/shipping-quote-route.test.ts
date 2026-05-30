import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks globales ────────────────────────────────────────────────────────

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/lib/shipping-package', () => ({
  resolveShippingPackages: vi.fn().mockResolvedValue({
    ok: true,
    packages: [{ weightG: 500, heightMm: 150, widthMm: 200, lengthMm: 300 }],
  }),
}))

vi.mock('@/lib/andreani', () => ({
  getShippingQuote: vi.fn().mockResolvedValue({
    price: 500000,
    estimatedDays: '3–7 días hábiles',
    quotedAt: '2026-05-30T00:00:00.000Z',
  }),
  buildCacheKey: vi.fn().mockReturnValue('andreani:mock:key'),
}))

vi.mock('@/lib/correo-argentino', () => ({
  getCorreoArgentinoQuote: vi.fn().mockResolvedValue({
    aSucursalCentavos: 700000,
    aDomicilioCentavos: 950000,
    rateSource: 'mock',
    quotedAt: '2026-05-30T00:00:00.000Z',
  }),
}))

// ─── Helpers ───────────────────────────────────────────────────────────────

const VALID_VARIANT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/shipping/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('POST /api/shipping/quote — correo argentino integration', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('incluye correoArgentino en el response cuando provincia está presente', async () => {
    const { POST } = await import('@/app/api/shipping/quote/route')
    const req = makeRequest({
      cp: '2000',
      provincia: 'AR-S',
      items: [{ variantId: VALID_VARIANT_ID, quantity: 1 }],
    })
    const res = await POST(req as any)
    const body = await res.json()

    expect(body).toHaveProperty('correoArgentino')
    expect(body.correoArgentino.rateSource).toBe('mock')
    expect(body.correoArgentino.aSucursalCentavos).toBeGreaterThan(0)
    expect(body.correoArgentino.aDomicilioCentavos).toBeGreaterThan(0)
  })

  it('NO incluye correoArgentino en el response cuando provincia está ausente', async () => {
    const { POST } = await import('@/app/api/shipping/quote/route')
    const req = makeRequest({
      cp: '2000',
      items: [{ variantId: VALID_VARIANT_ID, quantity: 1 }],
    })
    const res = await POST(req as any)
    const body = await res.json()

    expect(body).not.toHaveProperty('correoArgentino')
  })

  it('incluye andreani en el response con y sin provincia', async () => {
    const { POST } = await import('@/app/api/shipping/quote/route')

    // Con provincia
    const res1 = await POST(makeRequest({
      cp: '2000',
      provincia: 'AR-S',
      items: [{ variantId: VALID_VARIANT_ID, quantity: 1 }],
    }) as any)
    const body1 = await res1.json()
    expect(body1).toHaveProperty('andreani')
    expect(body1.andreani.price).toBe(500000)

    // Sin provincia
    const res2 = await POST(makeRequest({
      cp: '2000',
      items: [{ variantId: VALID_VARIANT_ID, quantity: 1 }],
    }) as any)
    const body2 = await res2.json()
    expect(body2).toHaveProperty('andreani')
  })

  it('llama getCorreoArgentinoQuote con cp y provincia correctos', async () => {
    const { getCorreoArgentinoQuote } = await import('@/lib/correo-argentino')
    const { POST } = await import('@/app/api/shipping/quote/route')

    await POST(makeRequest({
      cp: '5000',
      provincia: 'AR-X',
      items: [{ variantId: VALID_VARIANT_ID, quantity: 1 }],
    }) as any)

    expect(getCorreoArgentinoQuote).toHaveBeenCalledWith(
      expect.objectContaining({
        destinationCp: '5000',
        destinationProvincia: 'AR-X',
      })
    )
  })

  it('NO llama getCorreoArgentinoQuote cuando provincia está ausente', async () => {
    const { getCorreoArgentinoQuote } = await import('@/lib/correo-argentino')
    const { POST } = await import('@/app/api/shipping/quote/route')

    await POST(makeRequest({
      cp: '2000',
      items: [{ variantId: VALID_VARIANT_ID, quantity: 1 }],
    }) as any)

    expect(getCorreoArgentinoQuote).not.toHaveBeenCalled()
  })

  it('rechaza provincia con formato inválido (sin AR-)', async () => {
    const { POST } = await import('@/app/api/shipping/quote/route')
    const res = await POST(makeRequest({
      cp: '2000',
      provincia: 'Buenos Aires',
      items: [{ variantId: VALID_VARIANT_ID, quantity: 1 }],
    }) as any)

    expect(res.status).toBe(400)
  })

  it('cacheKey sigue presente en el response', async () => {
    const { POST } = await import('@/app/api/shipping/quote/route')
    const res = await POST(makeRequest({
      cp: '2000',
      provincia: 'AR-S',
      items: [{ variantId: VALID_VARIANT_ID, quantity: 1 }],
    }) as any)
    const body = await res.json()

    expect(body).toHaveProperty('cacheKey')
  })
})
