import { vi, describe, it, expect, beforeEach } from 'vitest'

const ORDER_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

describe('getOrderStatus (action)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns null when the order does not exist', async () => {
    vi.doMock('@/lib/db/orders', () => ({
      getOrderById: vi.fn().mockResolvedValue(null),
      updateOrderStatus: vi.fn(),
    }))
    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }))
    vi.doMock('@/lib/auth', () => ({ requireAdmin: vi.fn() }))
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

    const { getOrderStatus } = await import('@/lib/actions/orders')
    const result = await getOrderStatus(ORDER_UUID)

    expect(result).toBeNull()
  })

  it('returns { status: "pending" } when order is pending', async () => {
    vi.doMock('@/lib/db/orders', () => ({
      getOrderById: vi.fn().mockResolvedValue({ id: ORDER_UUID, status: 'pending' }),
      updateOrderStatus: vi.fn(),
    }))
    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }))
    vi.doMock('@/lib/auth', () => ({ requireAdmin: vi.fn() }))
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

    const { getOrderStatus } = await import('@/lib/actions/orders')
    const result = await getOrderStatus(ORDER_UUID)

    expect(result).toEqual({ status: 'pending' })
  })

  it('returns { status: "paid" } when order is paid', async () => {
    vi.doMock('@/lib/db/orders', () => ({
      getOrderById: vi.fn().mockResolvedValue({ id: ORDER_UUID, status: 'paid' }),
      updateOrderStatus: vi.fn(),
    }))
    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }))
    vi.doMock('@/lib/auth', () => ({ requireAdmin: vi.fn() }))
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

    const { getOrderStatus } = await import('@/lib/actions/orders')
    const result = await getOrderStatus(ORDER_UUID)

    expect(result).toEqual({ status: 'paid' })
  })
})
