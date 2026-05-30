import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

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
    { CORREO_ARGENTINO_MODE: 'mock', CORREO_ARGENTINO_ORIGIN_CP: '1414', CORREO_ARGENTINO_ORIGIN_PROVINCIA: 'AR-C' },
    async () => {
      const { getCorreoArgentinoQuote } = await import('@/lib/correo-argentino')
      const result = await getCorreoArgentinoQuote(BASE_PARAMS)
      expect(result.rateSource).toBe('mock')
    }
  ))

  it('retorna aSucursalCentavos y aDomicilioCentavos positivos en mock', withEnv(
    { CORREO_ARGENTINO_MODE: 'mock', CORREO_ARGENTINO_ORIGIN_CP: '1414', CORREO_ARGENTINO_ORIGIN_PROVINCIA: 'AR-C' },
    async () => {
      const { getCorreoArgentinoQuote } = await import('@/lib/correo-argentino')
      const result = await getCorreoArgentinoQuote(BASE_PARAMS)
      expect(result.aSucursalCentavos).toBeGreaterThan(0)
      expect(result.aDomicilioCentavos).toBeGreaterThan(0)
    }
  ))

  it('retorna quotedAt como ISO string en mock', withEnv(
    { CORREO_ARGENTINO_MODE: 'mock', CORREO_ARGENTINO_ORIGIN_CP: '1414', CORREO_ARGENTINO_ORIGIN_PROVINCIA: 'AR-C' },
    async () => {
      const { getCorreoArgentinoQuote } = await import('@/lib/correo-argentino')
      const result = await getCorreoArgentinoQuote(BASE_PARAMS)
      expect(() => new Date(result.quotedAt)).not.toThrow()
      expect(result.quotedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    }
  ))

  it('NO realiza llamadas HTTP en modo mock', withEnv(
    { CORREO_ARGENTINO_MODE: 'mock', CORREO_ARGENTINO_ORIGIN_CP: '1414', CORREO_ARGENTINO_ORIGIN_PROVINCIA: 'AR-C' },
    async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch')
      const { getCorreoArgentinoQuote } = await import('@/lib/correo-argentino')
      await getCorreoArgentinoQuote(BASE_PARAMS)
      expect(fetchSpy).not.toHaveBeenCalled()
      fetchSpy.mockRestore()
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

  it('lanza CorreoArgentinoConfigError si MODE=official (no implementado)', withEnv(
    { CORREO_ARGENTINO_MODE: 'official', CORREO_ARGENTINO_ORIGIN_CP: '1414', CORREO_ARGENTINO_ORIGIN_PROVINCIA: 'AR-C' },
    async () => {
      const { getCorreoArgentinoQuote, CorreoArgentinoConfigError } = await import('@/lib/correo-argentino')
      await expect(getCorreoArgentinoQuote(BASE_PARAMS)).rejects.toBeInstanceOf(CorreoArgentinoConfigError)
    }
  ))

  it('el mensaje de error de official menciona "credenciales"', withEnv(
    { CORREO_ARGENTINO_MODE: 'official', CORREO_ARGENTINO_ORIGIN_CP: '1414', CORREO_ARGENTINO_ORIGIN_PROVINCIA: 'AR-C' },
    async () => {
      const { getCorreoArgentinoQuote } = await import('@/lib/correo-argentino')
      await expect(getCorreoArgentinoQuote(BASE_PARAMS)).rejects.toThrow(/credenciales/i)
    }
  ))

  it('lanza CorreoArgentinoConfigError si MODE es un valor inválido', withEnv(
    { CORREO_ARGENTINO_MODE: 'tiendanube', CORREO_ARGENTINO_ORIGIN_CP: '1414', CORREO_ARGENTINO_ORIGIN_PROVINCIA: 'AR-C' },
    async () => {
      const { getCorreoArgentinoQuote, CorreoArgentinoConfigError } = await import('@/lib/correo-argentino')
      await expect(getCorreoArgentinoQuote(BASE_PARAMS)).rejects.toBeInstanceOf(CorreoArgentinoConfigError)
    }
  ))
})
