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

describe('POST /api/shipping/quote — correo argentino', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('incluye correoArgentino en el response con cp y provincia válidos', async () => {
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

  it('NO incluye datos de andreani ni cacheKey en el response', async () => {
    const { POST } = await import('@/app/api/shipping/quote/route')
    const res = await POST(makeRequest({
      cp: '2000',
      provincia: 'AR-S',
      items: [{ variantId: VALID_VARIANT_ID, quantity: 1 }],
    }) as any)
    const body = await res.json()

    expect(body).not.toHaveProperty('andreani')
    expect(body).not.toHaveProperty('cacheKey')
  })

  it('rechaza con 400 cuando provincia está ausente', async () => {
    const { getCorreoArgentinoQuote } = await import('@/lib/correo-argentino')
    const { POST } = await import('@/app/api/shipping/quote/route')
    const res = await POST(makeRequest({
      cp: '2000',
      items: [{ variantId: VALID_VARIANT_ID, quantity: 1 }],
    }) as any)

    expect(res.status).toBe(400)
    expect(getCorreoArgentinoQuote).not.toHaveBeenCalled()
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

  it('rechaza provincia con formato inválido (sin AR-)', async () => {
    const { POST } = await import('@/app/api/shipping/quote/route')
    const res = await POST(makeRequest({
      cp: '2000',
      provincia: 'Buenos Aires',
      items: [{ variantId: VALID_VARIANT_ID, quantity: 1 }],
    }) as any)

    expect(res.status).toBe(400)
  })

  it('responde 502 cuando la cotización de correo argentino falla', async () => {
    const { getCorreoArgentinoQuote } = await import('@/lib/correo-argentino')
    vi.mocked(getCorreoArgentinoQuote).mockRejectedValueOnce(new Error('boom'))

    const { POST } = await import('@/app/api/shipping/quote/route')
    const res = await POST(makeRequest({
      cp: '2000',
      provincia: 'AR-S',
      items: [{ variantId: VALID_VARIANT_ID, quantity: 1 }],
    }) as any)

    expect(res.status).toBe(502)
  })
})
