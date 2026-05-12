import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseMock } from '../../../helpers/supabase-mock'

const ORDER_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

describe('getOrderStatusHistory', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('maps order_status_history rows from snake_case to camelCase ordered by created_at ASC', async () => {
    const rows = [
      {
        id: 'history-1',
        order_id: ORDER_UUID,
        from_status: null,
        to_status: 'pending',
        actor_id: null,
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'history-2',
        order_id: ORDER_UUID,
        from_status: 'pending',
        to_status: 'paid',
        actor_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        created_at: '2026-01-02T00:00:00Z',
      },
    ]
    const { client, chain } = createSupabaseMock({ data: rows, error: null })
    const createAdminClient = vi.fn().mockReturnValue(client)
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient }))
    vi.doMock('@/lib/auth', () => ({ requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }) }))

    const { getOrderStatusHistory } = await import('@/lib/db/orders')
    const result = await getOrderStatusHistory(ORDER_UUID)

    expect(client.from).toHaveBeenCalledWith('order_status_history')
    expect(chain.eq).toHaveBeenCalledWith('order_id', ORDER_UUID)
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: true })
    expect(result).toEqual([
      {
        id: 'history-1',
        orderId: ORDER_UUID,
        fromStatus: null,
        toStatus: 'pending',
        actorId: null,
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'history-2',
        orderId: ORDER_UUID,
        fromStatus: 'pending',
        toStatus: 'paid',
        actorId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        createdAt: '2026-01-02T00:00:00Z',
      },
    ])
  })
})

describe('getOrdersForAdmin searchQuery', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('applies an ILIKE OR filter on customer_name and customer_email when searchQuery is provided', async () => {
    const { client, chain } = createSupabaseMock({ data: [], error: null, count: 0 })
    const orFilter = vi.fn().mockReturnValue(chain)
    ;(chain as unknown as { or: typeof orFilter }).or = orFilter
    const createAdminClient = vi.fn().mockReturnValue(client)
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient }))
    vi.doMock('@/lib/auth', () => ({ requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }) }))

    const { getOrdersForAdmin } = await import('@/lib/db/orders')
    await getOrdersForAdmin({ searchQuery: 'ana@test.com' })

    expect(orFilter).toHaveBeenCalledWith(
      'customer_name.ilike.%ana@test.com%,customer_email.ilike.%ana@test.com%'
    )
  })

  it('does not apply an ILIKE OR filter when searchQuery is omitted', async () => {
    const { client, chain } = createSupabaseMock({ data: [], error: null, count: 0 })
    const orFilter = vi.fn().mockReturnValue(chain)
    ;(chain as unknown as { or: typeof orFilter }).or = orFilter
    const createAdminClient = vi.fn().mockReturnValue(client)
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient }))
    vi.doMock('@/lib/auth', () => ({ requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }) }))

    const { getOrdersForAdmin } = await import('@/lib/db/orders')
    await getOrdersForAdmin()

    expect(orFilter).not.toHaveBeenCalled()
  })
})
