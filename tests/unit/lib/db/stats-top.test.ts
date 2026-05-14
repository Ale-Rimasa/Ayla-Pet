import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseMock } from '../../../helpers/supabase-mock'

describe('top stats RPCs', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('getTopProducts calls get_top_products and maps rows to camelCase', async () => {
    const { client, rpc } = createSupabaseMock({
      data: [
        {
          product_name: 'Chapita hueso',
          variant_name: 'Dorada',
          qty_sold: 12,
          revenue: 120000,
        },
      ],
      error: null,
    })
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn().mockReturnValue(client),
    }))
    vi.doMock('@/lib/auth', () => ({ requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }) }))

    const { getTopProducts } = await import('@/lib/db/stats')
    const result = await getTopProducts(3)

    expect(rpc).toHaveBeenCalledWith('get_top_products', { p_limit: 3 })
    expect(result).toEqual([
      {
        productName: 'Chapita hueso',
        variantName: 'Dorada',
        qtySold: 12,
        revenue: 120000,
      },
    ])
  })

  it('getTopCustomers calls get_top_customers and maps rows to camelCase', async () => {
    const { client, rpc } = createSupabaseMock({
      data: [
        {
          email: 'ana@test.com',
          name: 'Ana',
          order_count: 4,
          total_revenue: 450000,
        },
      ],
      error: null,
    })
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn().mockReturnValue(client),
    }))

    const { getTopCustomers } = await import('@/lib/db/stats')
    const result = await getTopCustomers(5)

    expect(rpc).toHaveBeenCalledWith('get_top_customers', { p_limit: 5 })
    expect(result).toEqual([
      {
        email: 'ana@test.com',
        name: 'Ana',
        orderCount: 4,
        totalRevenue: 450000,
      },
    ])
  })
})
