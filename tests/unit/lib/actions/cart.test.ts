import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseMock } from '../../../helpers/supabase-mock'

// ─── CartItemsSchema ─────────────────────────────────────────────────────────

describe('CartItemsSchema', () => {
  it('rejects an empty array', async () => {
    const { CartItemsSchema } = await import('@/lib/validations')
    const result = CartItemsSchema.safeParse([])
    expect(result.success).toBe(false)
  })

  it('rejects an array with more than 50 items', async () => {
    const { CartItemsSchema } = await import('@/lib/validations')
    const items = Array.from({ length: 51 }, (_, i) => ({
      variantId: `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
      quantity: 1,
    }))
    const result = CartItemsSchema.safeParse(items)
    expect(result.success).toBe(false)
  })

  it('rejects an item with an invalid UUID for variantId', async () => {
    const { CartItemsSchema } = await import('@/lib/validations')
    const result = CartItemsSchema.safeParse([
      { variantId: 'not-a-uuid', quantity: 1 },
    ])
    expect(result.success).toBe(false)
  })

  it('accepts a valid array with one item with a correct UUID', async () => {
    const { CartItemsSchema } = await import('@/lib/validations')
    const result = CartItemsSchema.safeParse([
      { variantId: '123e4567-e89b-12d3-a456-426614174000', quantity: 2 },
    ])
    expect(result.success).toBe(true)
  })
})

// ─── getVariantsStockAction ──────────────────────────────────────────────────

describe('getVariantsStockAction', () => {
  beforeEach(() => { vi.resetModules() })

  it('filters out non-UUID strings', async () => {
    const mockGetVariantsStock = vi.fn().mockResolvedValue({ '123e4567-e89b-12d3-a456-426614174000': 5 })
    vi.doMock('@/lib/db/stock', () => ({
      getVariantsStock: mockGetVariantsStock,
      validateCartStock: vi.fn(),
    }))
    const { getVariantsStockAction } = await import('@/lib/actions/cart')
    await getVariantsStockAction(['not-a-uuid', 'also-bad', '123e4567-e89b-12d3-a456-426614174000'])
    expect(mockGetVariantsStock).toHaveBeenCalledWith(['123e4567-e89b-12d3-a456-426614174000'])
  })

  it('deduplicates IDs before querying', async () => {
    const mockGetVariantsStock = vi.fn().mockResolvedValue({ '123e4567-e89b-12d3-a456-426614174000': 3 })
    vi.doMock('@/lib/db/stock', () => ({
      getVariantsStock: mockGetVariantsStock,
      validateCartStock: vi.fn(),
    }))
    const { getVariantsStockAction } = await import('@/lib/actions/cart')
    await getVariantsStockAction([
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174000',
    ])
    expect(mockGetVariantsStock).toHaveBeenCalledWith(['123e4567-e89b-12d3-a456-426614174000'])
    expect(mockGetVariantsStock.mock.calls[0][0]).toHaveLength(1)
  })

  it('caps at 50 items', async () => {
    const mockGetVariantsStock = vi.fn().mockResolvedValue({})
    vi.doMock('@/lib/db/stock', () => ({
      getVariantsStock: mockGetVariantsStock,
      validateCartStock: vi.fn(),
    }))
    const ids = Array.from({ length: 60 }, (_, i) =>
      `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`
    )
    const { getVariantsStockAction } = await import('@/lib/actions/cart')
    await getVariantsStockAction(ids)
    expect(mockGetVariantsStock.mock.calls[0][0]).toHaveLength(50)
  })

  it('returns {} when all IDs are invalid', async () => {
    const mockGetVariantsStock = vi.fn()
    vi.doMock('@/lib/db/stock', () => ({
      getVariantsStock: mockGetVariantsStock,
      validateCartStock: vi.fn(),
    }))
    const { getVariantsStockAction } = await import('@/lib/actions/cart')
    const result = await getVariantsStockAction(['bad', 'also-bad'])
    expect(result).toEqual({})
    expect(mockGetVariantsStock).not.toHaveBeenCalled()
  })

  it('calls getVariantsStock with the cleaned IDs and returns its result', async () => {
    const id1 = '123e4567-e89b-12d3-a456-426614174000'
    const id2 = '223e4567-e89b-12d3-a456-426614174001'
    const mockResult = { [id1]: 5, [id2]: 3 }
    const mockGetVariantsStock = vi.fn().mockResolvedValue(mockResult)
    vi.doMock('@/lib/db/stock', () => ({
      getVariantsStock: mockGetVariantsStock,
      validateCartStock: vi.fn(),
    }))
    const { getVariantsStockAction } = await import('@/lib/actions/cart')
    const result = await getVariantsStockAction([id1, id2])
    expect(mockGetVariantsStock).toHaveBeenCalledWith([id1, id2])
    expect(result).toEqual(mockResult)
  })
})

// ─── validateCartBeforeCheckout ──────────────────────────────────────────────
// We mock validateCartStock directly to isolate the action layer

describe('validateCartBeforeCheckout', () => {
  beforeEach(() => { vi.resetModules() })

  it('returns { ok: false } when Zod rejects empty array', async () => {
    vi.doMock('@/lib/db/stock', () => ({
      validateCartStock: vi.fn(),
    }))
    const { validateCartBeforeCheckout } = await import('@/lib/actions/cart')
    const result = await validateCartBeforeCheckout([])
    expect(result.ok).toBe(false)
  })

  it('returns { ok: false } when Zod rejects invalid UUID', async () => {
    vi.doMock('@/lib/db/stock', () => ({
      validateCartStock: vi.fn(),
    }))
    const { validateCartBeforeCheckout } = await import('@/lib/actions/cart')
    const result = await validateCartBeforeCheckout([
      { variantId: 'bad-uuid', quantity: 1 },
    ])
    expect(result.ok).toBe(false)
  })

  it('delegates to validateCartStock and returns { ok: true } when stock is sufficient', async () => {
    const mockValidateCartStock = vi.fn().mockResolvedValue({ ok: true })
    vi.doMock('@/lib/db/stock', () => ({
      validateCartStock: mockValidateCartStock,
    }))

    const { validateCartBeforeCheckout } = await import('@/lib/actions/cart')
    const result = await validateCartBeforeCheckout([
      { variantId: '123e4567-e89b-12d3-a456-426614174000', quantity: 2 },
    ])

    expect(result.ok).toBe(true)
    expect(mockValidateCartStock).toHaveBeenCalledOnce()
    expect(mockValidateCartStock).toHaveBeenCalledWith([
      { variantId: '123e4567-e89b-12d3-a456-426614174000', quantity: 2 },
    ])
  })

  it('delegates to validateCartStock and returns errors when stock is insufficient', async () => {
    const errors = [
      {
        variantId: '123e4567-e89b-12d3-a456-426614174000',
        productName: 'Chapa A',
        requested: 5,
        available: 1,
      },
    ]
    const mockValidateCartStock = vi.fn().mockResolvedValue({ ok: false, errors })
    vi.doMock('@/lib/db/stock', () => ({
      validateCartStock: mockValidateCartStock,
    }))

    const { validateCartBeforeCheckout } = await import('@/lib/actions/cart')
    const result = await validateCartBeforeCheckout([
      { variantId: '123e4567-e89b-12d3-a456-426614174000', quantity: 5 },
    ])

    expect(result.ok).toBe(false)
    if (result.ok === false) {
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].variantId).toBe('123e4567-e89b-12d3-a456-426614174000')
      expect(result.errors[0].requested).toBe(5)
      expect(result.errors[0].available).toBe(1)
    }
  })
})
