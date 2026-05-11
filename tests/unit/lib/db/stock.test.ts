import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseMock } from '../../../helpers/supabase-mock'

// getVariantsStock + validateCartStock use createClient (anon key, respects RLS)
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// decrementStock uses createAdminClient (service-role for writes)
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

// ─── getVariantsStock ────────────────────────────────────────────────────────

describe('getVariantsStock', () => {
  beforeEach(() => { vi.resetModules() })

  it('returns a map of variantId → stock for a single variant', async () => {
    const { client, chain } = createSupabaseMock({
      data: [{ id: 'variant-a', stock: 10 }],
      error: null,
    })
    chain['select'] = vi.fn().mockReturnValue(chain)
    chain['in'] = vi.fn().mockResolvedValue({ data: [{ id: 'variant-a', stock: 10 }], error: null })
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(client as any)

    const { getVariantsStock } = await import('@/lib/db/stock')
    const result = await getVariantsStock(['variant-a'])

    expect(result).toEqual({ 'variant-a': 10 })
  })

  it('returns stock 0 for a variant that is not found in DB', async () => {
    const { client, chain } = createSupabaseMock({ data: [], error: null })
    chain['select'] = vi.fn().mockReturnValue(chain)
    chain['in'] = vi.fn().mockResolvedValue({ data: [], error: null })
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(client as any)

    const { getVariantsStock } = await import('@/lib/db/stock')
    const result = await getVariantsStock(['unknown-variant'])

    // unknown variant not in DB → defaults to 0
    expect(result['unknown-variant']).toBe(0)
  })

  it('returns a map for multiple variants in a single query', async () => {
    const rows = [
      { id: 'v1', stock: 5 },
      { id: 'v2', stock: 0 },
      { id: 'v3', stock: 99 },
    ]
    const { client, chain } = createSupabaseMock({ data: rows, error: null })
    chain['select'] = vi.fn().mockReturnValue(chain)
    chain['in'] = vi.fn().mockResolvedValue({ data: rows, error: null })
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(client as any)

    const { getVariantsStock } = await import('@/lib/db/stock')
    const result = await getVariantsStock(['v1', 'v2', 'v3'])

    expect(result).toEqual({ v1: 5, v2: 0, v3: 99 })
  })
})

// ─── validateCartStock ───────────────────────────────────────────────────────

describe('validateCartStock', () => {
  beforeEach(() => { vi.resetModules() })

  it('returns { ok: true } when all items have sufficient stock', async () => {
    const rows = [
      { id: 'v1', stock: 10, products: { name: 'Chapa A' } },
      { id: 'v2', stock: 5,  products: { name: 'Chapa B' } },
    ]
    const { client, chain } = createSupabaseMock({ data: rows, error: null })
    chain['select'] = vi.fn().mockReturnValue(chain)
    chain['in'] = vi.fn().mockResolvedValue({ data: rows, error: null })
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(client as any)

    const { validateCartStock } = await import('@/lib/db/stock')
    const result = await validateCartStock([
      { variantId: 'v1', quantity: 3 },
      { variantId: 'v2', quantity: 5 },
    ])

    expect(result).toEqual({ ok: true })
  })

  it('returns { ok: false, errors[] } when a variant has insufficient stock', async () => {
    const rows = [
      { id: 'v1', stock: 2, products: { name: 'Chapa A' } },
    ]
    const { client, chain } = createSupabaseMock({ data: rows, error: null })
    chain['select'] = vi.fn().mockReturnValue(chain)
    chain['in'] = vi.fn().mockResolvedValue({ data: rows, error: null })
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(client as any)

    const { validateCartStock } = await import('@/lib/db/stock')
    const result = await validateCartStock([
      { variantId: 'v1', quantity: 5 },
    ])

    expect(result.ok).toBe(false)
    if (result.ok === false) {
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].variantId).toBe('v1')
      expect(result.errors[0].requested).toBe(5)
      expect(result.errors[0].available).toBe(2)
      expect(result.errors[0].productName).toBe('Chapa A')
    }
  })

  it('returns { ok: false } with stock=0 variant that has 0 stock', async () => {
    const rows = [
      { id: 'v-zero', stock: 0, products: { name: 'Sin stock' } },
    ]
    const { client, chain } = createSupabaseMock({ data: rows, error: null })
    chain['select'] = vi.fn().mockReturnValue(chain)
    chain['in'] = vi.fn().mockResolvedValue({ data: rows, error: null })
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(client as any)

    const { validateCartStock } = await import('@/lib/db/stock')
    const result = await validateCartStock([
      { variantId: 'v-zero', quantity: 1 },
    ])

    expect(result.ok).toBe(false)
    if (result.ok === false) {
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].available).toBe(0)
    }
  })

  it('returns { ok: false } with all items when Supabase returns an error', async () => {
    const { client, chain } = createSupabaseMock({ data: null, error: { message: 'connection failed' } })
    chain['select'] = vi.fn().mockReturnValue(chain)
    chain['in'] = vi.fn().mockResolvedValue({ data: null, error: { message: 'connection failed' } })
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(client as any)

    const { validateCartStock } = await import('@/lib/db/stock')
    const result = await validateCartStock([
      { variantId: 'v1', quantity: 2 },
      { variantId: 'v2', quantity: 1 },
    ])

    expect(result.ok).toBe(false)
    if (result.ok === false) {
      expect(result.errors).toHaveLength(2)
      const v1Error = result.errors.find((e) => e.variantId === 'v1')
      const v2Error = result.errors.find((e) => e.variantId === 'v2')
      expect(v1Error).toMatchObject({ variantId: 'v1', productName: 'unknown', requested: 2, available: 0 })
      expect(v2Error).toMatchObject({ variantId: 'v2', productName: 'unknown', requested: 1, available: 0 })
    }
  })

  it('collects all errors when multiple items have insufficient stock', async () => {
    const rows = [
      { id: 'v1', stock: 1, products: { name: 'Prod A' } },
      { id: 'v2', stock: 0, products: { name: 'Prod B' } },
    ]
    const { client, chain } = createSupabaseMock({ data: rows, error: null })
    chain['select'] = vi.fn().mockReturnValue(chain)
    chain['in'] = vi.fn().mockResolvedValue({ data: rows, error: null })
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(client as any)

    const { validateCartStock } = await import('@/lib/db/stock')
    const result = await validateCartStock([
      { variantId: 'v1', quantity: 5 },
      { variantId: 'v2', quantity: 1 },
    ])

    expect(result.ok).toBe(false)
    if (result.ok === false) {
      expect(result.errors).toHaveLength(2)
      const ids = result.errors.map((e) => e.variantId)
      expect(ids).toContain('v1')
      expect(ids).toContain('v2')
    }
  })
})
