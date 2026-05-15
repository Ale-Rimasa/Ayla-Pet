import { beforeEach, describe, expect, it, vi } from 'vitest'

const ORDER_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

describe('getOrderStatus customer dual path', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('uses the authenticated customer RLS query without rate limiting', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { status: 'paid' },
      error: null,
    })
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle,
    }
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'customer-id' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue(chain),
    }
    const checkRateLimit = vi.fn()
    const getOrderStatusById = vi.fn()

    vi.doMock('@/lib/supabase/server', () => ({
      createClient: vi.fn().mockResolvedValue(client),
    }))
    vi.doMock('@/lib/rate-limit', () => ({ checkRateLimit }))
    vi.doMock('@/lib/db/orders', () => ({
      getOrderStatusById,
      updateOrderStatus: vi.fn(),
    }))
    vi.doMock('next/headers', () => ({ headers: vi.fn() }))
    vi.doMock('@/lib/auth', () => ({ requireAdmin: vi.fn() }))

    const { getOrderStatus } = await import('@/lib/actions/orders')
    const result = await getOrderStatus(ORDER_UUID)

    expect(result).toEqual({ status: 'paid' })
    expect(client.from).toHaveBeenCalledWith('orders')
    expect(chain.select).toHaveBeenCalledWith('status')
    expect(chain.eq).toHaveBeenCalledWith('id', ORDER_UUID)
    expect(checkRateLimit).not.toHaveBeenCalled()
    expect(getOrderStatusById).not.toHaveBeenCalled()
  })

  it('uses the existing rate-limited capability-token path when unauthenticated', async () => {
    const checkRateLimit = vi.fn().mockResolvedValue(true)
    const getOrderStatusById = vi.fn().mockResolvedValue({ status: 'pending' })
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: vi.fn().mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      }),
    }))
    vi.doMock('@/lib/rate-limit', () => ({ checkRateLimit }))
    vi.doMock('@/lib/db/orders', () => ({
      getOrderStatusById,
      updateOrderStatus: vi.fn(),
    }))
    vi.doMock('next/headers', () => ({
      headers: vi.fn().mockResolvedValue({
        get: vi.fn().mockReturnValue('203.0.113.5'),
      }),
    }))
    vi.doMock('@/lib/auth', () => ({ requireAdmin: vi.fn() }))

    const { getOrderStatus } = await import('@/lib/actions/orders')
    const result = await getOrderStatus(ORDER_UUID)

    expect(result).toEqual({ status: 'pending' })
    expect(checkRateLimit).toHaveBeenCalledWith(
      'order-status:203.0.113.5',
      30,
      60_000
    )
    expect(getOrderStatusById).toHaveBeenCalledWith(ORDER_UUID)
  })
})
