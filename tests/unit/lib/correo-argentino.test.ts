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

  it('retorna aSucursalCentavos y aDomicilioCentavos positivos en mock', withEnv(
    { CORREO_ARGENTINO_MODE: 'mock', CORREO_ARGENTINO_ORIGIN_CP: '1414' },
    async () => {
      const { getCorreoArgentinoQuote } = await import('@/lib/correo-argentino')
      const result = await getCorreoArgentinoQuote(BASE_PARAMS)
      expect(result.aSucursalCentavos).toBeGreaterThan(0)
      expect(result.aDomicilioCentavos).toBeGreaterThan(0)
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
        aSucursalCentavos: 70000,
        aDomicilioCentavos: 95000,
        rateSource: 'official' as const,
        quotedAt: '2026-06-10T00:00:00.000Z',
        aDomicilioDiasMin: '2',
        aDomicilioDiasMax: '5',
        aSucursalDiasMin: '1',
        aSucursalDiasMax: '3',
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
