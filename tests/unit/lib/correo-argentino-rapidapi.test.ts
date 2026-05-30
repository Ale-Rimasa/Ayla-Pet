import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Fixtures ─────────────────────────────────────────────────────────────

const VALID_ENV = {
  CORREO_ARGENTINO_RAPIDAPI_KEY: 'test-key-abc123',
  CORREO_ARGENTINO_ORIGIN_CP: '1414',
  CORREO_ARGENTINO_ORIGIN_PROVINCIA: 'AR-C',
}

const SINGLE_PACKAGE = [
  { weightG: 500, heightMm: 150, widthMm: 200, lengthMm: 300 },
]

const BASE_PARAMS = {
  destinationCp: '2000',
  destinationProvincia: 'AR-S',
  packages: SINGLE_PACKAGE,
}

// API responses
const PESO_VOL_RESPONSE = { pesoVolumetricoCalculado: 1.8 }
const PRECIO_RESPONSE   = { paqarClasico: { aSucursal: 9878, aDomicilio: 13017 } }

function mockFetch(responses: unknown[]) {
  let call = 0
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    const body = responses[call++] ?? {}
    return { ok: true, json: async () => body } as Response
  })
}

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

// ─── Config guards ─────────────────────────────────────────────────────────

describe('getQuoteFromRapidApi — config guards', () => {
  beforeEach(() => { vi.resetModules(); vi.restoreAllMocks() })

  it('lanza CorreoArgentinoConfigError si CORREO_ARGENTINO_RAPIDAPI_KEY está ausente', withEnv(
    { ...VALID_ENV, CORREO_ARGENTINO_RAPIDAPI_KEY: undefined },
    async () => {
      const { getQuoteFromRapidApi } = await import('@/lib/correo-argentino-rapidapi')
      const { CorreoArgentinoConfigError } = await import('@/lib/correo-argentino')
      await expect(getQuoteFromRapidApi(BASE_PARAMS)).rejects.toBeInstanceOf(CorreoArgentinoConfigError)
    }
  ))

  it('lanza CorreoArgentinoConfigError si CORREO_ARGENTINO_ORIGIN_CP está ausente', withEnv(
    { ...VALID_ENV, CORREO_ARGENTINO_ORIGIN_CP: undefined },
    async () => {
      const { getQuoteFromRapidApi } = await import('@/lib/correo-argentino-rapidapi')
      const { CorreoArgentinoConfigError } = await import('@/lib/correo-argentino')
      await expect(getQuoteFromRapidApi(BASE_PARAMS)).rejects.toBeInstanceOf(CorreoArgentinoConfigError)
    }
  ))
})

// ─── Conversión de unidades ────────────────────────────────────────────────

describe('getQuoteFromRapidApi — conversión de unidades', () => {
  beforeEach(() => { vi.resetModules(); vi.restoreAllMocks() })

  it('llama calcularPesoVol con dimensiones en cm (mm / 10)', withEnv(VALID_ENV, async () => {
    mockFetch([PESO_VOL_RESPONSE, PRECIO_RESPONSE])
    const { getQuoteFromRapidApi } = await import('@/lib/correo-argentino-rapidapi')
    await getQuoteFromRapidApi(BASE_PARAMS)

    const firstCall = vi.mocked(fetch).mock.calls[0]
    const url = firstCall[0] as string
    // heightMm=150 → alto=15, widthMm=200 → ancho=20, lengthMm=300 → largo=30
    expect(url).toContain('alto=15')
    expect(url).toContain('ancho=20')
    expect(url).toContain('largo=30')
  }))

  it('usa peso volumétrico cuando es mayor que el peso real', withEnv(VALID_ENV, async () => {
    // weightG=500 → 0.5 kg real, pesoVolumetrico=1.8 kg → debe usar 1.8
    mockFetch([{ pesoVolumetricoCalculado: 1.8 }, PRECIO_RESPONSE])
    const { getQuoteFromRapidApi } = await import('@/lib/correo-argentino-rapidapi')
    await getQuoteFromRapidApi(BASE_PARAMS)

    const secondCall = vi.mocked(fetch).mock.calls[1]
    const url = secondCall[0] as string
    expect(url).toContain('peso=1.8')
  }))

  it('usa peso real cuando es mayor que el volumétrico', withEnv(VALID_ENV, async () => {
    // weightG=5000 → 5 kg real, pesoVolumetrico=1.8 kg → debe usar 5
    const heavyParams = { ...BASE_PARAMS, packages: [{ weightG: 5000, heightMm: 150, widthMm: 200, lengthMm: 300 }] }
    mockFetch([{ pesoVolumetricoCalculado: 1.8 }, PRECIO_RESPONSE])
    const { getQuoteFromRapidApi } = await import('@/lib/correo-argentino-rapidapi')
    await getQuoteFromRapidApi(heavyParams)

    const secondCall = vi.mocked(fetch).mock.calls[1]
    const url = secondCall[0] as string
    expect(url).toContain('peso=5')
  }))

  it('convierte pesos ARS a centavos (× 100)', withEnv(VALID_ENV, async () => {
    // aSucursal: 9878 pesos → 987800 centavos; aDomicilio: 13017 → 1301700
    mockFetch([PESO_VOL_RESPONSE, PRECIO_RESPONSE])
    const { getQuoteFromRapidApi } = await import('@/lib/correo-argentino-rapidapi')
    const result = await getQuoteFromRapidApi(BASE_PARAMS)

    expect(result.aSucursalCentavos).toBe(987800)
    expect(result.aDomicilioCentavos).toBe(1301700)
  }))
})

// ─── Response shape ────────────────────────────────────────────────────────

describe('getQuoteFromRapidApi — response shape', () => {
  beforeEach(() => { vi.resetModules(); vi.restoreAllMocks() })

  it('retorna rateSource: rapidapi', withEnv(VALID_ENV, async () => {
    mockFetch([PESO_VOL_RESPONSE, PRECIO_RESPONSE])
    const { getQuoteFromRapidApi } = await import('@/lib/correo-argentino-rapidapi')
    const result = await getQuoteFromRapidApi(BASE_PARAMS)
    expect(result.rateSource).toBe('rapidapi')
  }))

  it('retorna quotedAt como ISO string', withEnv(VALID_ENV, async () => {
    mockFetch([PESO_VOL_RESPONSE, PRECIO_RESPONSE])
    const { getQuoteFromRapidApi } = await import('@/lib/correo-argentino-rapidapi')
    const result = await getQuoteFromRapidApi(BASE_PARAMS)
    expect(result.quotedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  }))

  it('lanza error si la API devuelve schema inválido (sin paqarClasico)', withEnv(VALID_ENV, async () => {
    mockFetch([PESO_VOL_RESPONSE, { unexpected: true }])
    const { getQuoteFromRapidApi } = await import('@/lib/correo-argentino-rapidapi')
    await expect(getQuoteFromRapidApi(BASE_PARAMS)).rejects.toThrow()
  }))

  it('la clave API NO aparece en el response', withEnv(VALID_ENV, async () => {
    mockFetch([PESO_VOL_RESPONSE, PRECIO_RESPONSE])
    const { getQuoteFromRapidApi } = await import('@/lib/correo-argentino-rapidapi')
    const result = await getQuoteFromRapidApi(BASE_PARAMS)
    const resultStr = JSON.stringify(result)
    expect(resultStr).not.toContain('test-key-abc123')
  }))
})

// ─── Multi-package ─────────────────────────────────────────────────────────

describe('getQuoteFromRapidApi — múltiples paquetes', () => {
  beforeEach(() => { vi.resetModules(); vi.restoreAllMocks() })

  it('suma los pesos de todos los paquetes para el cálculo', withEnv(VALID_ENV, async () => {
    const multiPackageParams = {
      ...BASE_PARAMS,
      packages: [
        { weightG: 1000, heightMm: 100, widthMm: 100, lengthMm: 100 },
        { weightG: 2000, heightMm: 100, widthMm: 100, lengthMm: 100 },
      ],
    }
    // pesoVolumetrico bajo → usa peso real = 3 kg
    mockFetch([{ pesoVolumetricoCalculado: 0.5 }, PRECIO_RESPONSE])
    const { getQuoteFromRapidApi } = await import('@/lib/correo-argentino-rapidapi')
    await getQuoteFromRapidApi(multiPackageParams)

    const secondCall = vi.mocked(fetch).mock.calls[1]
    const url = secondCall[0] as string
    expect(url).toContain('peso=3')
  }))
})
