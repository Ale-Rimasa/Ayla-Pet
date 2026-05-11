import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseMock } from '../helpers/supabase-mock'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

describe('decrementStock', () => {
  beforeEach(() => { vi.resetModules() })

  it('returns { ok: true } without executing queries when items array is empty', async () => {
    const { client } = createSupabaseMock({ data: [], error: null })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { decrementStock } = await import('@/lib/db/stock')
    const result = await decrementStock([])

    expect(result).toEqual({ ok: true })
    expect(client.rpc).not.toHaveBeenCalled()
  })

  it('returns { ok: true } when single item has sufficient stock (RETURNING returns row)', async () => {
    const { client } = createSupabaseMock({ data: [{ id: 'variant-1' }], error: null })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { decrementStock } = await import('@/lib/db/stock')
    const result = await decrementStock([{ variantId: 'variant-1', quantity: 1 }])

    expect(result).toEqual({ ok: true })
  })

  it('returns { ok: false, error } with variantId when RETURNING is empty (insufficient stock)', async () => {
    const { client } = createSupabaseMock({ data: [], error: null })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { decrementStock } = await import('@/lib/db/stock')
    const result = await decrementStock([{ variantId: 'variant-abc', quantity: 5 }])

    expect(result.ok).toBe(false)
    expect(result.error).toContain('variant-abc')
  })

  it('processes multiple items and returns { ok: true } when all succeed', async () => {
    const { client } = createSupabaseMock({ data: [{ id: 'v' }], error: null })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { decrementStock } = await import('@/lib/db/stock')
    const result = await decrementStock([
      { variantId: 'v1', quantity: 1 },
      { variantId: 'v2', quantity: 2 },
    ])

    expect(result).toEqual({ ok: true })
    expect(client.rpc).toHaveBeenCalledTimes(2)
  })

  it('stops at first failure and returns error with the failing variantId', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin')

    const rpcMock = vi.fn()
      .mockResolvedValueOnce({ data: [{ id: 'v1' }], error: null }) // v1 ok
      .mockResolvedValueOnce({ data: [], error: null })              // v2 fails (insufficient stock)
    const client = { rpc: rpcMock }
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { decrementStock } = await import('@/lib/db/stock')
    const result = await decrementStock([
      { variantId: 'v1', quantity: 1 },
      { variantId: 'v2', quantity: 99 },
      { variantId: 'v3', quantity: 1 }, // should NOT be processed
    ])

    expect(result.ok).toBe(false)
    expect(result.error).toContain('v2')
    expect(rpcMock).toHaveBeenCalledTimes(2) // v3 never reached
  })
})
