import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createSupabaseMock } from '../../helpers/supabase-mock'

// Valid RFC 4122 UUID
const ORDER_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

describe('updateOrderStatus (action)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('rejects if not admin', async () => {
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockRejectedValue(new Error('Unauthorized')),
    }))
    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }))
    const { client } = createSupabaseMock({ data: null, error: null })
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn().mockReturnValue(client),
    }))
    vi.doMock('@/lib/db/orders', () => ({
      updateOrderStatus: vi.fn().mockResolvedValue({ ok: true }),
    }))

    const { updateOrderStatus } = await import('@/lib/actions/orders')
    await expect(
      updateOrderStatus({ orderId: ORDER_UUID, status: 'paid' })
    ).rejects.toThrow()

    expect(client.from).not.toHaveBeenCalled()
  })

  it('returns validation_error for invalid status', async () => {
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }),
    }))
    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }))
    const { client } = createSupabaseMock({ data: null, error: null })
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn().mockReturnValue(client),
    }))
    const dbUpdateOrderStatus = vi.fn().mockResolvedValue({ ok: true })
    vi.doMock('@/lib/db/orders', () => ({
      updateOrderStatus: dbUpdateOrderStatus,
    }))

    const { updateOrderStatus } = await import('@/lib/actions/orders')
    // @ts-expect-error — intentionally invalid status for test
    const result = await updateOrderStatus({ orderId: ORDER_UUID, status: 'invalid_status' })

    expect(result).toEqual({ ok: false, error: 'validation_error' })
    expect(dbUpdateOrderStatus).not.toHaveBeenCalled()
  })

  it('returns invalid_transition for forbidden status change', async () => {
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }),
    }))
    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }))
    const { client, chain } = createSupabaseMock({ data: { status: 'delivered' }, error: null })
    chain.maybeSingle = vi.fn().mockResolvedValue({ data: { status: 'delivered' }, error: null })
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn().mockReturnValue(client),
    }))
    const dbUpdateOrderStatus = vi.fn().mockResolvedValue({ ok: true })
    vi.doMock('@/lib/db/orders', () => ({
      updateOrderStatus: dbUpdateOrderStatus,
    }))

    const { updateOrderStatus } = await import('@/lib/actions/orders')
    // delivered → pending is forbidden
    const result = await updateOrderStatus({ orderId: ORDER_UUID, status: 'pending' })

    expect(result).toEqual({ ok: false, error: 'invalid_transition' })
    expect(dbUpdateOrderStatus).not.toHaveBeenCalled()
  })

  it('calls db updateOrderStatus and revalidates on valid transition', async () => {
    const revalidatePath = vi.fn()
    const revalidateTag = vi.fn()
    vi.doMock('next/cache', () => ({ revalidatePath, revalidateTag }))
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }),
    }))
    const { client, chain } = createSupabaseMock({ data: { status: 'pending' }, error: null })
    chain.maybeSingle = vi.fn().mockResolvedValue({ data: { status: 'pending' }, error: null })
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn().mockReturnValue(client),
    }))
    const dbUpdateOrderStatus = vi.fn().mockResolvedValue({ ok: true })
    vi.doMock('@/lib/db/orders', () => ({
      updateOrderStatus: dbUpdateOrderStatus,
    }))

    const { updateOrderStatus } = await import('@/lib/actions/orders')
    // pending → paid is a valid transition
    const result = await updateOrderStatus({ orderId: ORDER_UUID, status: 'paid' })

    expect(result).toEqual({ ok: true })
    expect(dbUpdateOrderStatus).toHaveBeenCalledWith(ORDER_UUID, 'paid', 'admin-id')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/pedidos')
    expect(revalidateTag).toHaveBeenCalledWith(`pedido:${ORDER_UUID}`, {})
  })
})
