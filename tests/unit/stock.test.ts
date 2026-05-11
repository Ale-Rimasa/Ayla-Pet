import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseMock } from '../helpers/supabase-mock'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

describe('decrementStock', () => {
  beforeEach(() => { vi.resetModules() })

  it('returns { ok: true } without executing queries when items array is empty', async () => {
    const { client } = createSupabaseMock({ data: null, error: null })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { decrementStock } = await import('@/lib/db/stock')
    const result = await decrementStock([])

    expect(result).toEqual({ ok: true })
    expect(client.rpc).not.toHaveBeenCalled()
  })

  it('returns { ok: true } when single item has sufficient stock', async () => {
    const { client } = createSupabaseMock({ data: null, error: null })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { decrementStock } = await import('@/lib/db/stock')
    const result = await decrementStock([{ variantId: 'variant-1', quantity: 1 }])

    expect(result).toEqual({ ok: true })
    expect(client.rpc).toHaveBeenCalledOnce()
    expect(client.rpc).toHaveBeenCalledWith('decrement_stock_batch', {
      p_items: [{ variant_id: 'variant-1', qty: 1 }],
    })
  })

  it('returns { ok: false } with variantId when stock is insufficient', async () => {
    const { client } = createSupabaseMock({
      data: null,
      error: { message: 'insufficient_stock_for_variant:variant-abc' },
    })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { decrementStock } = await import('@/lib/db/stock')
    const result = await decrementStock([{ variantId: 'variant-abc', quantity: 5 }])

    expect(result.ok).toBe(false)
    expect(result.error).toContain('variant-abc')
  })

  it('calls decrement_stock_batch once for multiple items (single atomic transaction)', async () => {
    const { client } = createSupabaseMock({ data: null, error: null })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { decrementStock } = await import('@/lib/db/stock')
    const result = await decrementStock([
      { variantId: 'v1', quantity: 1 },
      { variantId: 'v2', quantity: 2 },
    ])

    expect(result).toEqual({ ok: true })
    // Exactly one RPC call — the whole batch is atomic
    expect(client.rpc).toHaveBeenCalledOnce()
    expect(client.rpc).toHaveBeenCalledWith('decrement_stock_batch', {
      p_items: [
        { variant_id: 'v1', qty: 1 },
        { variant_id: 'v2', qty: 2 },
      ],
    })
  })

  it('rolls back all decrements when any item has insufficient stock', async () => {
    // DB raises exception → entire transaction rolled back
    const { client } = createSupabaseMock({
      data: null,
      error: { message: 'insufficient_stock_for_variant:v2' },
    })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { decrementStock } = await import('@/lib/db/stock')
    const result = await decrementStock([
      { variantId: 'v1', quantity: 1 },
      { variantId: 'v2', quantity: 99 },
      { variantId: 'v3', quantity: 1 },
    ])

    expect(result.ok).toBe(false)
    expect(result.error).toContain('v2')
    // Single call — v1 and v3 are never partially applied
    expect(client.rpc).toHaveBeenCalledOnce()
  })
})
