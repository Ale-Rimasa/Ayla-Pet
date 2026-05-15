import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseMock } from '../../../helpers/supabase-mock'

const ORDER_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const USER_ID = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'

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

describe('customer order queries', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('getOrdersForCustomer uses the customer Supabase client, filters by user_id, and paginates', async () => {
    const rows = [
      {
        id: ORDER_UUID,
        status: 'paid',
        customer_name: 'Ana Gomez',
        customer_email: 'ana@example.com',
        customer_phone: '1122334455',
        shipping_street: 'Calle 123',
        shipping_city: 'CABA',
        shipping_province: 'Buenos Aires',
        shipping_postal_code: '1000',
        subtotal: 1000,
        shipping_cost: 500,
        total: 1500,
        mp_preference_id: null,
        mp_payment_id: null,
        notes: null,
        created_at: '2026-01-02T00:00:00Z',
        updated_at: '2026-01-02T00:00:00Z',
        order_items: [],
      },
    ]
    const { client, chain } = createSupabaseMock({ data: rows, error: null, count: 1 })
    const createClient = vi.fn().mockResolvedValue(client)
    const createAdminClient = vi.fn()
    vi.doMock('@/lib/supabase/server', () => ({ createClient }))
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient }))
    vi.doMock('@/lib/auth', () => ({ requireAdmin: vi.fn() }))

    const { getOrdersForCustomer } = await import('@/lib/db/orders')
    const result = await getOrdersForCustomer(ORDER_UUID, { page: 2, pageSize: 10 })

    expect(createClient).toHaveBeenCalledOnce()
    expect(createAdminClient).not.toHaveBeenCalled()
    expect(client.from).toHaveBeenCalledWith('orders')
    expect(chain.select).toHaveBeenCalledWith('*, order_items(*)', { count: 'exact' })
    expect(chain.eq).toHaveBeenCalledWith('user_id', ORDER_UUID)
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(chain.range).toHaveBeenCalledWith(10, 19)
    expect(result.count).toBe(1)
    expect(result.data[0]?.id).toBe(ORDER_UUID)
  })

  it('getOrdersForCustomer returns an empty list and zero count when there are no rows', async () => {
    const { client } = createSupabaseMock({ data: null, error: null, count: undefined })
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: vi.fn().mockResolvedValue(client),
    }))
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
    vi.doMock('@/lib/auth', () => ({ requireAdmin: vi.fn() }))

    const { getOrdersForCustomer } = await import('@/lib/db/orders')
    const result = await getOrdersForCustomer(ORDER_UUID)

    expect(result).toEqual({ data: [], count: 0 })
  })

  it('getOrderForCustomer uses an id filter plus user/email ownership fallback', async () => {
    const row = {
      id: ORDER_UUID,
      status: 'pending',
      customer_name: 'Ana Gomez',
      customer_email: 'ana@example.com',
      customer_phone: '1122334455',
      shipping_street: 'Calle 123',
      shipping_city: 'CABA',
      shipping_province: 'Buenos Aires',
      shipping_postal_code: '1000',
      subtotal: 1000,
      shipping_cost: 500,
      total: 1500,
      mp_preference_id: null,
      mp_payment_id: null,
      notes: null,
      created_at: '2026-01-02T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
      order_items: [],
    }
    const { client, chain } = createSupabaseMock({ data: row, error: null })
    const orFilter = vi.fn().mockReturnValue(chain)
    ;(chain as unknown as { or: typeof orFilter }).or = orFilter
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: vi.fn().mockResolvedValue(client),
    }))
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
    vi.doMock('@/lib/auth', () => ({ requireAdmin: vi.fn() }))

    const { getOrderForCustomer } = await import('@/lib/db/orders')
    const result = await getOrderForCustomer(ORDER_UUID, {
      id: USER_ID,
      email: 'ana@example.com',
    })

    expect(chain.eq).toHaveBeenCalledWith('id', ORDER_UUID)
    expect(orFilter).toHaveBeenCalledWith(
      `user_id.eq.${USER_ID},customer_email.eq.ana@example.com`
    )
    expect(result?.id).toBe(ORDER_UUID)
  })

  it('getOrderForCustomer returns null when no owned order matches', async () => {
    const { client } = createSupabaseMock({ data: null, error: null })
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: vi.fn().mockResolvedValue(client),
    }))
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
    vi.doMock('@/lib/auth', () => ({ requireAdmin: vi.fn() }))

    const { getOrderForCustomer } = await import('@/lib/db/orders')
    const result = await getOrderForCustomer(ORDER_UUID, {
      id: USER_ID,
      email: 'ana@example.com',
    })

    expect(result).toBeNull()
  })
})
