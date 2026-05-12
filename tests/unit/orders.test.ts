import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseMock } from '../helpers/supabase-mock'
import type { CreateOrderPayload, OrderStatus } from '@/types'

// Mock the admin client module
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

const mockPayload: CreateOrderPayload = {
  customer: { name: 'Ana García', email: 'ana@test.com', phone: '1112345678' },
  shipping: { street: 'Av. Corrientes 1234', city: 'CABA', province: 'Buenos Aires', postalCode: '1043' },
  items: [
    {
      variantId: 'variant-uuid-1',
      productName: 'Taza Cerámica',
      variantName: 'Azul',
      unitPrice: 250000,
      quantity: 2,
      subtotal: 500000,
      imageUrl: 'https://example.com/img.jpg',
    },
  ],
  subtotal: 500000,
  shippingCost: 50000,
  total: 550000,
}

describe('createOrder', () => {
  beforeEach(() => { vi.resetModules() })

  it('calls rpc with snake_case mapped customer fields', async () => {
    const { client, rpc } = createSupabaseMock({ data: 'order-uuid-123', error: null })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { createOrder } = await import('@/lib/db/orders')
    await createOrder(mockPayload)

    expect(rpc).toHaveBeenCalledWith('create_order', expect.objectContaining({
      p_customer_name: 'Ana García',
      p_customer_email: 'ana@test.com',
      p_customer_phone: '1112345678',
    }))
  })

  it('calls rpc with snake_case mapped shipping fields', async () => {
    const { client, rpc } = createSupabaseMock({ data: 'order-uuid-123', error: null })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { createOrder } = await import('@/lib/db/orders')
    await createOrder(mockPayload)

    expect(rpc).toHaveBeenCalledWith('create_order', expect.objectContaining({
      p_shipping_street: 'Av. Corrientes 1234',
      p_shipping_city: 'CABA',
      p_shipping_province: 'Buenos Aires',
      p_shipping_postal_code: '1043',
      p_subtotal: 500000,
      p_shipping_cost: 50000,
      p_total: 550000,
    }))
  })

  it('serializes items with snake_case keys in p_items array', async () => {
    const { client, rpc } = createSupabaseMock({ data: 'order-uuid-123', error: null })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { createOrder } = await import('@/lib/db/orders')
    await createOrder(mockPayload)

    const call = rpc.mock.calls[0][1]
    expect(call.p_items).toEqual([{
      variant_id: 'variant-uuid-1',
      product_name: 'Taza Cerámica',
      variant_name: 'Azul',
      unit_price: 250000,
      quantity: 2,
      subtotal: 500000,
      image_url: 'https://example.com/img.jpg',
    }])
  })

  it('returns { ok: true, data: { orderId } } on success', async () => {
    const { client } = createSupabaseMock({ data: 'order-uuid-123', error: null })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { createOrder } = await import('@/lib/db/orders')
    const result = await createOrder(mockPayload)

    expect(result).toEqual({ ok: true, data: { orderId: 'order-uuid-123' } })
  })

  it('returns { ok: false, error } on RPC error without throwing', async () => {
    const { client } = createSupabaseMock({ data: null, error: { message: 'DB error' } })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { createOrder } = await import('@/lib/db/orders')
    const result = await createOrder(mockPayload)

    expect(result.ok).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('returns { ok: false } without calling RPC when items array is empty', async () => {
    const { client, rpc } = createSupabaseMock({ data: 'order-uuid', error: null })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { createOrder } = await import('@/lib/db/orders')
    const result = await createOrder({ ...mockPayload, items: [] })

    expect(result.ok).toBe(false)
    expect(rpc).not.toHaveBeenCalled()
  })
})

describe('getOrderById', () => {
  beforeEach(() => { vi.resetModules() })

  const flatOrderRow = {
    id: 'order-uuid',
    status: 'pending' as OrderStatus,
    customer_name: 'Ana García',
    customer_email: 'ana@test.com',
    customer_phone: '1112345678',
    shipping_street: 'Av. Corrientes 1234',
    shipping_city: 'CABA',
    shipping_province: 'Buenos Aires',
    shipping_postal_code: '1043',
    subtotal: 500000,
    shipping_cost: 50000,
    total: 550000,
    mp_preference_id: null,
    mp_payment_id: null,
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    order_items: [
      {
        id: 'item-uuid',
        variant_id: 'v-uuid',
        product_name: 'Taza',
        variant_name: 'Azul',
        unit_price: 250000,
        quantity: 2,
        subtotal: 500000,
        image_url: 'https://example.com/img.jpg',
        created_at: '2026-01-01T00:00:00Z',
      },
    ],
  }

  it('returns null when order does not exist', async () => {
    const { client, chain } = createSupabaseMock({ data: null, error: null })
    chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { getOrderById } = await import('@/lib/db/orders')
    const result = await getOrderById('non-existent')
    expect(result).toBeNull()
  })

  it('maps customer flat fields to nested customer object', async () => {
    const { client, chain } = createSupabaseMock({ data: null, error: null })
    chain.maybeSingle = vi.fn().mockResolvedValue({ data: flatOrderRow, error: null })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { getOrderById } = await import('@/lib/db/orders')
    const result = await getOrderById('order-uuid')

    expect(result?.customer).toEqual({ name: 'Ana García', email: 'ana@test.com', phone: '1112345678' })
  })

  it('maps shipping flat fields to nested shippingAddress object', async () => {
    const { client, chain } = createSupabaseMock({ data: null, error: null })
    chain.maybeSingle = vi.fn().mockResolvedValue({ data: flatOrderRow, error: null })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { getOrderById } = await import('@/lib/db/orders')
    const result = await getOrderById('order-uuid')

    expect(result?.shippingAddress).toEqual({
      street: 'Av. Corrientes 1234',
      city: 'CABA',
      province: 'Buenos Aires',
      postalCode: '1043',
    })
  })

  it('maps order_items to items with camelCase fields', async () => {
    const { client, chain } = createSupabaseMock({ data: null, error: null })
    chain.maybeSingle = vi.fn().mockResolvedValue({ data: flatOrderRow, error: null })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { getOrderById } = await import('@/lib/db/orders')
    const result = await getOrderById('order-uuid')

    expect(result?.items[0]).toMatchObject({
      variantId: 'v-uuid',
      productName: 'Taza',
      variantName: 'Azul',
      unitPrice: 250000,
      quantity: 2,
      subtotal: 500000,
    })
  })

  it('maps snake_case order fields to camelCase', async () => {
    const { client, chain } = createSupabaseMock({ data: null, error: null })
    chain.maybeSingle = vi.fn().mockResolvedValue({ data: flatOrderRow, error: null })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { getOrderById } = await import('@/lib/db/orders')
    const result = await getOrderById('order-uuid')

    expect(result?.shippingCost).toBe(50000)
    expect(result?.mpPreferenceId).toBeNull()
    expect(result?.createdAt).toBe('2026-01-01T00:00:00Z')
  })
})

describe('updateOrderStatus', () => {
  beforeEach(() => { vi.resetModules() })

  it('calls RPC with correct params and returns ok:true', async () => {
    const { client, rpc } = createSupabaseMock({ data: { ok: true }, error: null })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { updateOrderStatus } = await import('@/lib/db/orders')
    const result = await updateOrderStatus('order-uuid', 'pending', 'paid', 'actor-uuid')

    expect(result.ok).toBe(true)
    expect(rpc).toHaveBeenCalledWith('update_order_status_atomic', {
      p_order_id: 'order-uuid',
      p_from_status: 'pending',
      p_new_status: 'paid',
      p_actor_id: 'actor-uuid',
    })
  })

  it('returns concurrent_modification when RPC signals it', async () => {
    const { client } = createSupabaseMock({
      data: { ok: false, error: 'concurrent_modification' },
      error: null,
    })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { updateOrderStatus } = await import('@/lib/db/orders')
    const result = await updateOrderStatus('order-uuid', 'pending', 'paid')

    expect(result).toEqual({ ok: false, error: 'concurrent_modification' })
  })

  it('returns error when RPC call itself fails', async () => {
    const { client } = createSupabaseMock({ data: null, error: { message: 'rpc error' } })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { updateOrderStatus } = await import('@/lib/db/orders')
    const result = await updateOrderStatus('order-uuid', 'pending', 'paid')

    expect(result.ok).toBe(false)
    expect(result.error).toBe('rpc error')
  })

  it('passes null actor_id when actorId not provided', async () => {
    const { client, rpc } = createSupabaseMock({ data: { ok: true }, error: null })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { updateOrderStatus } = await import('@/lib/db/orders')
    await updateOrderStatus('order-uuid', 'pending', 'shipped')

    expect(rpc).toHaveBeenCalledWith('update_order_status_atomic', expect.objectContaining({
      p_actor_id: null,
    }))
  })
})
