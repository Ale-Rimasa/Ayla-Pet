import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks globales ────────────────────────────────────────────────────────

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue(true),
}))

const AGENCY_B_1900 = {
  code: 'B-0001',
  name: 'Sucursal Centro',
  address: 'Calle 1 100',
  postalCode: '1900',
}

const AGENCY_B_1901 = {
  code: 'B-0002',
  name: 'Sucursal Norte',
  address: 'Calle 2 200',
  postalCode: '1901',
}

const AGENCY_B_OTHER = {
  code: 'B-0003',
  name: 'Sucursal Lejana',
  address: 'Calle 3 300',
  postalCode: '7000',
}

vi.mock('@/lib/correo-argentino-official', () => ({
  getAgencies: vi.fn().mockResolvedValue([AGENCY_B_1900, AGENCY_B_1901, AGENCY_B_OTHER]),
}))

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeRequest(query: string): Request {
  return new Request(`http://localhost/api/shipping/agencies${query}`, {
    method: 'GET',
  })
}

const ORIGINAL_ENV = { ...process.env }

function withEnv(vars: Record<string, string | undefined>, fn: () => Promise<void>) {
  return async () => {
    const original: Record<string, string | undefined> = {}
    for (const [k, v] of Object.entries(vars)) {
      original[k] = process.env[k]
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
    try { await fn() }
    finally {
      for (const [k, v] of Object.entries(original)) {
        if (v === undefined) delete process.env[k]
        else process.env[k] = v
      }
    }
  }
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('GET /api/shipping/agencies', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...ORIGINAL_ENV, CORREO_ARGENTINO_MODE: 'official' }
  })

  it('provincia y cp válidos devuelven 200 { agencies } filtradas por CP (match exacto)', withEnv({}, async () => {
    const { GET } = await import('@/app/api/shipping/agencies/route')
    const res = await GET(makeRequest('?provincia=AR-B&cp=1900') as any)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.agencies).toEqual([AGENCY_B_1900])
  }))

  it('llama getAgencies con el provinceCode MiCorreo mapeado (AR-B → B)', withEnv({}, async () => {
    const { getAgencies } = await import('@/lib/correo-argentino-official')
    const { GET } = await import('@/app/api/shipping/agencies/route')

    await GET(makeRequest('?provincia=AR-B&cp=1900') as any)

    expect(getAgencies).toHaveBeenCalledWith({ provinceCode: 'B' })
  }))

  it('CP sin match exacto cae a fallback de prefijo de 2 dígitos', withEnv({}, async () => {
    const { GET } = await import('@/app/api/shipping/agencies/route')
    const res = await GET(makeRequest('?provincia=AR-B&cp=1955') as any)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.agencies.map((a: { code: string }) => a.code).sort()).toEqual(['B-0001', 'B-0002'])
  }))

  it('sin match exacto ni prefijo, devuelve TODAS las agencias de la provincia', withEnv({}, async () => {
    const { GET } = await import('@/app/api/shipping/agencies/route')
    const res = await GET(makeRequest('?provincia=AR-B&cp=9999') as any)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.agencies).toHaveLength(3)
  }))

  it('provincia con formato inválido (sin AR-) responde 400 invalid_input sin llamar getAgencies', withEnv({}, async () => {
    const { getAgencies } = await import('@/lib/correo-argentino-official')
    const { GET } = await import('@/app/api/shipping/agencies/route')
    const res = await GET(makeRequest('?provincia=Buenos+Aires&cp=1900') as any)

    expect(res.status).toBe(400)
    expect(getAgencies).not.toHaveBeenCalled()
  }))

  it('cp con formato inválido responde 400 invalid_input sin llamar getAgencies', withEnv({}, async () => {
    const { getAgencies } = await import('@/lib/correo-argentino-official')
    const { GET } = await import('@/app/api/shipping/agencies/route')
    const res = await GET(makeRequest('?provincia=AR-B&cp=abc') as any)

    expect(res.status).toBe(400)
    expect(getAgencies).not.toHaveBeenCalled()
  }))

  it('provincia no mapeable (AR-ZZ) responde 400 invalid_province sin llamar getAgencies', withEnv({}, async () => {
    const { getAgencies } = await import('@/lib/correo-argentino-official')
    const { GET } = await import('@/app/api/shipping/agencies/route')
    const res = await GET(makeRequest('?provincia=AR-ZZ&cp=1900') as any)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('invalid_province')
    expect(getAgencies).not.toHaveBeenCalled()
  }))

  it('CORREO_ARGENTINO_MODE !== official devuelve 200 { agencies: [] } sin llamar getAgencies', withEnv(
    { CORREO_ARGENTINO_MODE: 'mock' },
    async () => {
      const { getAgencies } = await import('@/lib/correo-argentino-official')
      const { GET } = await import('@/app/api/shipping/agencies/route')
      const res = await GET(makeRequest('?provincia=AR-B&cp=1900') as any)
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.agencies).toEqual([])
      expect(getAgencies).not.toHaveBeenCalled()
    }
  ))

  it('CorreoArgentinoApiError de getAgencies responde 502 agencies_unavailable sin leak de detalle', withEnv({}, async () => {
    const { getAgencies } = await import('@/lib/correo-argentino-official')
    const { CorreoArgentinoApiError } = await import('@/lib/correo-argentino')
    vi.mocked(getAgencies).mockRejectedValueOnce(
      new CorreoArgentinoApiError('Customer ID inválido en /agencies: 402', { status: 402, code: 'invalid_customer_id' })
    )

    const { GET } = await import('@/app/api/shipping/agencies/route')
    const res = await GET(makeRequest('?provincia=AR-B&cp=1900') as any)
    const body = await res.json()

    expect(res.status).toBe(502)
    expect(body.error).toBe('agencies_unavailable')
    expect(JSON.stringify(body)).not.toMatch(/Customer ID|402|invalid_customer_id/)
  }))

  it('timeout de getAgencies responde 502 agencies_unavailable', withEnv({}, async () => {
    const { getAgencies } = await import('@/lib/correo-argentino-official')
    const { CorreoArgentinoApiError } = await import('@/lib/correo-argentino')
    vi.mocked(getAgencies).mockRejectedValueOnce(
      new CorreoArgentinoApiError('Timeout al contactar MiCorreo', { code: 'timeout' })
    )

    const { GET } = await import('@/app/api/shipping/agencies/route')
    const res = await GET(makeRequest('?provincia=AR-B&cp=1900') as any)

    expect(res.status).toBe(502)
  }))

  it('rate limit excedido responde 429 sin llamar getAgencies', withEnv({}, async () => {
    const { checkRateLimit } = await import('@/lib/rate-limit')
    vi.mocked(checkRateLimit).mockResolvedValueOnce(false)

    const { getAgencies } = await import('@/lib/correo-argentino-official')
    const { GET } = await import('@/app/api/shipping/agencies/route')
    const res = await GET(makeRequest('?provincia=AR-B&cp=1900') as any)

    expect(res.status).toBe(429)
    expect(getAgencies).not.toHaveBeenCalled()
  }))

  it('incluye Cache-Control: private, max-age=300 en respuesta exitosa', withEnv({}, async () => {
    const { GET } = await import('@/app/api/shipping/agencies/route')
    const res = await GET(makeRequest('?provincia=AR-B&cp=1900') as any)

    expect(res.headers.get('Cache-Control')).toBe('private, max-age=300')
  }))
})
