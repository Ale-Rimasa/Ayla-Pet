import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseMock, mockAdminClient } from '../../../helpers/supabase-mock'
import type { CreateOrderPayload } from '@/types'
import type { Agency } from '@/lib/correo-argentino'

const VARIANT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const ORDER_UUID = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'

const AGENCY: Agency = {
  code: 'B-0123',
  name: 'Sucursal La Plata Centro',
  address: 'Calle 7 1234',
  locality: 'La Plata',
  city: 'La Plata',
  province: 'Buenos Aires',
  postalCode: '1900',
}

function basePayload(overrides: Partial<CreateOrderPayload> = {}): CreateOrderPayload {
  return {
    customer: { name: 'Ana García', email: 'ana@test.com', phone: '1112345678' },
    shipping: { street: 'Corrientes 1', city: 'CABA', province: 'AR-C', postalCode: '1043' },
    items: [{
      variantId: VARIANT_ID,
      productName: 'Chapita',
      variantName: 'S',
      unitPrice: 500000,
      quantity: 1,
      subtotal: 500000,
      imageUrl: null,
    }],
    subtotal: 500000,
    shippingCost: 600000,
    total: 1100000,
    ...overrides,
  }
}

describe('createOrder — shipping fulfillment fields (deliveredType/productType/agencyCode/agencySnapshot)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('passes p_shipping_delivered_type, p_shipping_product_type, p_shipping_agency_code and p_shipping_agency_snapshot when provided', async () => {
    const { client, rpc } = createSupabaseMock({ data: ORDER_UUID, error: null })
    mockAdminClient(client)

    const { createOrder } = await import('@/lib/db/orders')

    await createOrder(basePayload({
      deliveredType: 'S',
      productType: 'CP',
      agencyCode: AGENCY.code,
      agencySnapshot: AGENCY,
    }))

    expect(rpc).toHaveBeenCalledWith(
      'create_order',
      expect.objectContaining({
        p_shipping_delivered_type: 'S',
        p_shipping_product_type: 'CP',
        p_shipping_agency_code: AGENCY.code,
        p_shipping_agency_snapshot: AGENCY,
      })
    )
  })

  it('sends the 4 new params as null when not provided in the payload', async () => {
    const { client, rpc } = createSupabaseMock({ data: ORDER_UUID, error: null })
    mockAdminClient(client)

    const { createOrder } = await import('@/lib/db/orders')

    await createOrder(basePayload())

    expect(rpc).toHaveBeenCalledWith(
      'create_order',
      expect.objectContaining({
        p_shipping_delivered_type: null,
        p_shipping_product_type: null,
        p_shipping_agency_code: null,
        p_shipping_agency_snapshot: null,
      })
    )
  })

  it('forces agency fields to null for deliveredType=D even if agencyCode/agencySnapshot are present in the payload', async () => {
    const { client, rpc } = createSupabaseMock({ data: ORDER_UUID, error: null })
    mockAdminClient(client)

    const { createOrder } = await import('@/lib/db/orders')

    await createOrder(basePayload({
      deliveredType: 'D',
      productType: 'CP',
      agencyCode: null,
      agencySnapshot: null,
    }))

    expect(rpc).toHaveBeenCalledWith(
      'create_order',
      expect.objectContaining({
        p_shipping_delivered_type: 'D',
        p_shipping_agency_code: null,
        p_shipping_agency_snapshot: null,
      })
    )
  })
})
