import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Helpers ───────────────────────────────────────────────────────────────

const MOCK_PACKAGES = [
  { weightG: 500, heightMm: 50, widthMm: 80, lengthMm: 100 },
]

const BASE_PARAMS = {
  destinationCp: '2000',
  destinationProvincia: 'AR-S',
  packages: MOCK_PACKAGES,
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

// ─── Mock mode ─────────────────────────────────────────────────────────────

describe('getCorreoArgentinoQuote — modo mock', () => {
  beforeEach(() => { vi.resetModules() })

  it('retorna rateSource: mock cuando CORREO_ARGENTINO_MODE=mock', withEnv(
    { CORREO_ARGENTINO_MODE: 'mock', CORREO_ARGENTINO_ORIGIN_CP: '1414' },
    async () => {
      const { getCorreoArgentinoQuote } = await import('@/lib/correo-argentino')
      const result = await getCorreoArgentinoQuote(BASE_PARAMS)
      expect(result.rateSource).toBe('mock')
    }
  ))

  it('retorna domicilio.clasico y sucursal.clasico con priceCentavos positivos en mock', withEnv(
    { CORREO_ARGENTINO_MODE: 'mock', CORREO_ARGENTINO_ORIGIN_CP: '1414' },
    async () => {
      const { getCorreoArgentinoQuote } = await import('@/lib/correo-argentino')
      const result = await getCorreoArgentinoQuote(BASE_PARAMS)
      expect(result.sucursal.clasico?.priceCentavos).toBeGreaterThan(0)
      expect(result.domicilio.clasico?.priceCentavos).toBeGreaterThan(0)
    }
  ))

  it('NO incluye los campos legacy aDomicilioCentavos/aSucursalCentavos en mock', withEnv(
    { CORREO_ARGENTINO_MODE: 'mock', CORREO_ARGENTINO_ORIGIN_CP: '1414' },
    async () => {
      const { getCorreoArgentinoQuote } = await import('@/lib/correo-argentino')
      const result = await getCorreoArgentinoQuote(BASE_PARAMS)
      expect(result).not.toHaveProperty('aDomicilioCentavos')
      expect(result).not.toHaveProperty('aSucursalCentavos')
    }
  ))

  it('retorna quotedAt como ISO string en mock', withEnv(
    { CORREO_ARGENTINO_MODE: 'mock', CORREO_ARGENTINO_ORIGIN_CP: '1414' },
    async () => {
      const { getCorreoArgentinoQuote } = await import('@/lib/correo-argentino')
      const result = await getCorreoArgentinoQuote(BASE_PARAMS)
      expect(() => new Date(result.quotedAt)).not.toThrow()
      expect(result.quotedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    }
  ))

  it('NO realiza llamadas HTTP en modo mock', withEnv(
    { CORREO_ARGENTINO_MODE: 'mock', CORREO_ARGENTINO_ORIGIN_CP: '1414' },
    async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch')
      const { getCorreoArgentinoQuote } = await import('@/lib/correo-argentino')
      await getCorreoArgentinoQuote(BASE_PARAMS)
      expect(fetchSpy).not.toHaveBeenCalled()
      fetchSpy.mockRestore()
    }
  ))
})

// ─── Modo official — dispatch ───────────────────────────────────────────────

describe('getCorreoArgentinoQuote — modo official (dispatch)', () => {
  beforeEach(() => { vi.resetModules() })

  it('despacha a getQuoteFromOfficial y retorna su resultado sin modificar', withEnv(
    { CORREO_ARGENTINO_MODE: 'official' },
    async () => {
      const officialQuote = {
        domicilio: {
          clasico: { priceCentavos: 95000, diasMin: '2', diasMax: '5' },
          expreso: null,
        },
        sucursal: {
          clasico: { priceCentavos: 70000, diasMin: '1', diasMax: '3' },
          expreso: null,
        },
        rateSource: 'official' as const,
        quotedAt: '2026-06-10T00:00:00.000Z',
      }

      const getQuoteFromOfficial = vi.fn().mockResolvedValue(officialQuote)
      vi.doMock('@/lib/correo-argentino-official', () => ({ getQuoteFromOfficial }))

      const { getCorreoArgentinoQuote } = await import('@/lib/correo-argentino')
      const result = await getCorreoArgentinoQuote(BASE_PARAMS)

      expect(getQuoteFromOfficial).toHaveBeenCalledWith(BASE_PARAMS)
      expect(result).toEqual(officialQuote)
    }
  ))
})

// ─── Config guards ─────────────────────────────────────────────────────────

describe('getCorreoArgentinoQuote — config guards', () => {
  beforeEach(() => { vi.resetModules() })

  it('lanza CorreoArgentinoConfigError si MODE no está seteado en production', withEnv(
    { CORREO_ARGENTINO_MODE: undefined, NODE_ENV: 'production' },
    async () => {
      const { getCorreoArgentinoQuote, CorreoArgentinoConfigError } = await import('@/lib/correo-argentino')
      await expect(getCorreoArgentinoQuote(BASE_PARAMS)).rejects.toBeInstanceOf(CorreoArgentinoConfigError)
    }
  ))

  it('el mensaje de error en production sin MODE menciona "mock" y "official"', withEnv(
    { CORREO_ARGENTINO_MODE: undefined, NODE_ENV: 'production' },
    async () => {
      const { getCorreoArgentinoQuote } = await import('@/lib/correo-argentino')
      await expect(getCorreoArgentinoQuote(BASE_PARAMS)).rejects.toThrow(/mock.*official|official.*mock/i)
    }
  ))

  it('lanza CorreoArgentinoConfigError si MODE es un valor inválido (modo legacy eliminado o desconocido)', withEnv(
    { CORREO_ARGENTINO_MODE: 'tiendanube', CORREO_ARGENTINO_ORIGIN_CP: '1414' },
    async () => {
      const { getCorreoArgentinoQuote, CorreoArgentinoConfigError } = await import('@/lib/correo-argentino')
      await expect(getCorreoArgentinoQuote(BASE_PARAMS)).rejects.toBeInstanceOf(CorreoArgentinoConfigError)
    }
  ))

  it('el mensaje de error de modo inválido lista solo "mock | official"', withEnv(
    { CORREO_ARGENTINO_MODE: 'tiendanube', CORREO_ARGENTINO_ORIGIN_CP: '1414' },
    async () => {
      const { getCorreoArgentinoQuote } = await import('@/lib/correo-argentino')
      await expect(getCorreoArgentinoQuote(BASE_PARAMS)).rejects.toThrow(/mock \| official/)
    }
  ))

  it('en dev/test sin MODE seteado retorna mock sin llamadas HTTP', withEnv(
    { CORREO_ARGENTINO_MODE: undefined, NODE_ENV: 'test', CORREO_ARGENTINO_ORIGIN_CP: '1414' },
    async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch')
      const { getCorreoArgentinoQuote } = await import('@/lib/correo-argentino')
      const result = await getCorreoArgentinoQuote(BASE_PARAMS)
      expect(result.rateSource).toBe('mock')
      expect(fetchSpy).not.toHaveBeenCalled()
      fetchSpy.mockRestore()
    }
  ))
})

// ─── arToMicorreoProvinceCode / AR_PROVINCE_TO_MICORREO ─────────────────────

describe('arToMicorreoProvinceCode', () => {
  it('mapea AR-B (Buenos Aires) a "B"', async () => {
    const { arToMicorreoProvinceCode } = await import('@/lib/correo-argentino')
    expect(arToMicorreoProvinceCode('AR-B')).toBe('B')
  })

  it('mapea AR-C (CABA) a "C"', async () => {
    const { arToMicorreoProvinceCode } = await import('@/lib/correo-argentino')
    expect(arToMicorreoProvinceCode('AR-C')).toBe('C')
  })

  it('mapea AR-X (Córdoba) a "X"', async () => {
    const { arToMicorreoProvinceCode } = await import('@/lib/correo-argentino')
    expect(arToMicorreoProvinceCode('AR-X')).toBe('X')
  })

  it('devuelve null para un código de provincia desconocido', async () => {
    const { arToMicorreoProvinceCode } = await import('@/lib/correo-argentino')
    expect(arToMicorreoProvinceCode('AR-ZZ')).toBeNull()
  })

  it('AR_PROVINCE_TO_MICORREO tiene exactamente 24 jurisdicciones', async () => {
    const { AR_PROVINCE_TO_MICORREO } = await import('@/lib/correo-argentino')
    expect(Object.keys(AR_PROVINCE_TO_MICORREO)).toHaveLength(24)
  })

  it('AR_PROVINCE_TO_MICORREO usa claves AR-X y valores de 1 letra', async () => {
    const { AR_PROVINCE_TO_MICORREO } = await import('@/lib/correo-argentino')
    for (const [key, value] of Object.entries(AR_PROVINCE_TO_MICORREO)) {
      expect(key).toMatch(/^AR-[A-Z]+$/)
      expect(value).toMatch(/^[A-Z]$/)
    }
  })
})

// ─── filterAgenciesByPostalCode ─────────────────────────────────────────────

describe('filterAgenciesByPostalCode', () => {
  const AGENCIES = [
    { code: 'B-0001', name: 'Sucursal Centro', address: 'Calle 1 100', postalCode: '1900' },
    { code: 'B-0002', name: 'Sucursal Norte', address: 'Calle 2 200', postalCode: '1901' },
    { code: 'B-0003', name: 'Sucursal Sur', address: 'Calle 3 300', postalCode: '2000' },
    { code: 'B-0004', name: 'Sucursal Sin CP', address: 'Calle 4 400' },
  ]

  it('match exacto: devuelve solo las agencias con postalCode === cp', async () => {
    const { filterAgenciesByPostalCode } = await import('@/lib/correo-argentino')
    const result = filterAgenciesByPostalCode(AGENCIES, '1900')
    expect(result).toHaveLength(1)
    expect(result[0]?.code).toBe('B-0001')
  })

  it('fallback a prefijo de 2 dígitos cuando no hay match exacto', async () => {
    const { filterAgenciesByPostalCode } = await import('@/lib/correo-argentino')
    // '1955' no matchea exacto a ninguna, pero '19' es prefijo de 1900 y 1901
    const result = filterAgenciesByPostalCode(AGENCIES, '1955')
    expect(result).toHaveLength(2)
    expect(result.map((a) => a.code).sort()).toEqual(['B-0001', 'B-0002'])
  })

  it('fallback a TODAS las agencias cuando no hay match exacto ni por prefijo', async () => {
    const { filterAgenciesByPostalCode } = await import('@/lib/correo-argentino')
    const result = filterAgenciesByPostalCode(AGENCIES, '9999')
    expect(result).toHaveLength(AGENCIES.length)
  })

  it('array de agencias vacío devuelve array vacío sin lanzar', async () => {
    const { filterAgenciesByPostalCode } = await import('@/lib/correo-argentino')
    const result = filterAgenciesByPostalCode([], '1900')
    expect(result).toEqual([])
  })

  it('agencias sin postalCode no matchean por exacto ni prefijo, pero entran en el fallback completo', async () => {
    const { filterAgenciesByPostalCode } = await import('@/lib/correo-argentino')
    const result = filterAgenciesByPostalCode(AGENCIES, '9999')
    expect(result.some((a) => a.code === 'B-0004')).toBe(true)
  })
})
