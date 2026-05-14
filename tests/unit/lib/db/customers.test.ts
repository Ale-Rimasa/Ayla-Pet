import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseMock } from '../../../helpers/supabase-mock'

describe('getCustomersForAdmin', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('calls get_customers_for_admin with pagination params and maps rows to camelCase', async () => {
    const rows = [
      {
        email: 'ana@test.com',
        name: 'Ana',
        phone: '5491111111111',
        order_count: 3,
        total_revenue: 125000,
        last_order_at: '2026-05-10T00:00:00Z',
        first_order_at: '2026-03-10T00:00:00Z',
        is_vip: true,
        total_count: 7,
      },
    ]
    const { client, rpc } = createSupabaseMock({ data: rows, error: null })
    const createAdminClient = vi.fn().mockReturnValue(client)
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient }))
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }),
    }))

    const { getCustomersForAdmin } = await import('@/lib/db/customers')
    const result = await getCustomersForAdmin({ page: 2, pageSize: 10 })

    expect(rpc).toHaveBeenCalledWith('get_customers_for_admin', {
      p_limit: 10,
      p_offset: 10,
    })
    expect(result).toEqual({
      rows: [
        {
          email: 'ana@test.com',
          name: 'Ana',
          phone: '5491111111111',
          orderCount: 3,
          totalRevenue: 125000,
          lastOrderAt: '2026-05-10T00:00:00Z',
          firstOrderAt: '2026-03-10T00:00:00Z',
          isVip: true,
        },
      ],
      total: 7,
    })
  })

  it('passes search through and reads total from the first row total_count', async () => {
    const { client, rpc } = createSupabaseMock({
      data: [
        {
          email: 'ana@test.com',
          name: 'Ana',
          phone: '5491111111111',
          order_count: 1,
          total_revenue: 5000,
          last_order_at: '2026-05-10T00:00:00Z',
          first_order_at: '2026-05-10T00:00:00Z',
          is_vip: false,
          total_count: 1,
        },
      ],
      error: null,
    })
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn().mockReturnValue(client),
    }))
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }),
    }))

    const { getCustomersForAdmin } = await import('@/lib/db/customers')
    const result = await getCustomersForAdmin({ search: 'ana@test.com' })

    expect(rpc).toHaveBeenCalledWith('get_customers_for_admin', {
      p_search: 'ana@test.com',
      p_limit: 25,
      p_offset: 0,
    })
    expect(result.total).toBe(1)
  })
})

describe('getCustomersKpis', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('calls get_customers_kpis and maps the first row to camelCase', async () => {
    const { client, rpc } = createSupabaseMock({
      data: [
        {
          total_customers: 20,
          new_this_month: 4,
          recurring: 8,
          vip_count: 4,
        },
      ],
      error: null,
    })
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn().mockReturnValue(client),
    }))
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }),
    }))

    const { getCustomersKpis } = await import('@/lib/db/customers')
    const result = await getCustomersKpis()

    expect(rpc).toHaveBeenCalledWith('get_customers_kpis')
    expect(result).toEqual({
      totalCustomers: 20,
      newThisMonth: 4,
      recurring: 8,
      vipCount: 4,
    })
  })

  it('keeps vipCount null when the RPC returns null', async () => {
    const { client } = createSupabaseMock({
      data: [
        {
          total_customers: 4,
          new_this_month: 1,
          recurring: 0,
          vip_count: null,
        },
      ],
      error: null,
    })
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn().mockReturnValue(client),
    }))
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }),
    }))

    const { getCustomersKpis } = await import('@/lib/db/customers')
    const result = await getCustomersKpis()

    expect(result.vipCount).toBeNull()
  })
})
