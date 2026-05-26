import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const PKG = [{ weightG: 600, heightMm: 200, widthMm: 150, lengthMm: 150 }]

// ── T18: ANDREANI_MODE=qa/production bloquea sin llamada HTTP ─────────────────

describe('ANDREANI_MODE guards', () => {
  const originalMode = process.env.ANDREANI_MODE
  const originalEnv  = process.env.NODE_ENV

  afterEach(() => {
    process.env.ANDREANI_MODE = originalMode
    vi.resetModules()
  })

  it('ANDREANI_MODE=qa lanza AndreaniConfigError sin llamada HTTP', async () => {
    process.env.ANDREANI_MODE = 'qa'
    vi.resetModules()
    const { getShippingQuote, AndreaniConfigError } = await import('@/lib/andreani')

    await expect(
      getShippingQuote({ destinationCp: '1414', packages: PKG, declaredValueCentavos: 500000 })
    ).rejects.toBeInstanceOf(AndreaniConfigError)
  })

  it('ANDREANI_MODE=production lanza AndreaniConfigError sin llamada HTTP', async () => {
    process.env.ANDREANI_MODE = 'production'
    vi.resetModules()
    const { getShippingQuote, AndreaniConfigError } = await import('@/lib/andreani')

    await expect(
      getShippingQuote({ destinationCp: '1414', packages: PKG, declaredValueCentavos: 500000 })
    ).rejects.toBeInstanceOf(AndreaniConfigError)
  })

  it('ANDREANI_MODE inválido lanza AndreaniConfigError', async () => {
    process.env.ANDREANI_MODE = 'staging' as string
    vi.resetModules()
    const { getShippingQuote, AndreaniConfigError } = await import('@/lib/andreani')

    await expect(
      getShippingQuote({ destinationCp: '1414', packages: PKG, declaredValueCentavos: 0 })
    ).rejects.toBeInstanceOf(AndreaniConfigError)
  })

  it('ANDREANI_MODE=mock retorna quote sin llamada HTTP', async () => {
    process.env.ANDREANI_MODE = 'mock'
    vi.resetModules()
    const { getShippingQuote } = await import('@/lib/andreani')

    const quote = await getShippingQuote({
      destinationCp: '1414',
      packages: PKG,
      declaredValueCentavos: 500000,
    })

    expect(quote.price).toBeGreaterThan(0)
    expect(typeof quote.estimatedDays).toBe('string')
    expect(typeof quote.quotedAt).toBe('string')
  })
})

// ── Pricing mock multibulto ────────────────────────────────────────────────────

describe('mock pricing', () => {
  beforeEach(() => {
    process.env.ANDREANI_MODE = 'mock'
    vi.resetModules()
  })

  it('2 bultos cuestan más que 1 bulto', async () => {
    const { getShippingQuote } = await import('@/lib/andreani')
    const params = { destinationCp: '1414', declaredValueCentavos: 500000 }

    const q1 = await getShippingQuote({ ...params, packages: [PKG[0]] })
    const q2 = await getShippingQuote({ ...params, packages: [PKG[0], PKG[0]] })

    expect(q2.price).toBeGreaterThan(q1.price)
  })

  it('precio es integer (centavos)', async () => {
    const { getShippingQuote } = await import('@/lib/andreani')
    const quote = await getShippingQuote({ destinationCp: '1414', packages: PKG, declaredValueCentavos: 0 })
    expect(Number.isInteger(quote.price)).toBe(true)
  })
})
