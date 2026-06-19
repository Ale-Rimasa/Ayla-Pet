import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPreferenceCreate = vi.fn()
const mockPaymentGet = vi.fn()

vi.mock('mercadopago', () => ({
  MercadoPagoConfig: vi.fn(function () { return {} }),
  Preference: vi.fn(function () { return { create: mockPreferenceCreate } }),
  Payment: vi.fn(function () { return { get: mockPaymentGet } }),
}))

vi.mock('@/env', () => ({
  env: {
    MP_ACCESS_TOKEN: 'TEST-fake-token',
    NEXT_PUBLIC_SITE_URL: 'https://test.example.com',
  },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

import type { Order } from '@/types'

const mockOrder: Order = {
  id: 'order-uuid-1',
  status: 'pending',
  customer: {
    name: 'Ana García',
    email: 'ana@test.com',
    phone: '1112345678',
  },
  shippingAddress: {
    street: 'Av. Corrientes 1234',
    city: 'CABA',
    province: 'Buenos Aires',
    postalCode: '1043',
  },
  items: [
    {
      id: 'item-1',
      variantId: 'variant-1',
      productName: 'Taza Cerámica',
      variantName: 'Azul',
      unitPrice: 250000, // centavos
      quantity: 2,
      subtotal: 500000, // centavos
      imageUrl: 'https://example.com/img.jpg',
      createdAt: '2026-01-01T00:00:00Z',
    },
  ],
  subtotal: 500000,
  shippingCost: 50000,
  total: 550000,
  mpPreferenceId: null,
  mpPaymentId: null,
  notes: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('createPreference', () => {
  beforeEach(() => {
    vi.resetModules()
    mockPreferenceCreate.mockReset()
    mockPaymentGet.mockReset()
  })

  it('returns { ok: true, data: { initPoint, preferenceId } } on MP success', async () => {
    mockPreferenceCreate.mockResolvedValue({
      id: 'pref-abc-123',
      init_point: 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-abc-123',
    })

    const { createPreference } = await import('@/lib/payments')
    const result = await createPreference(mockOrder)

    expect(result).toEqual({
      ok: true,
      data: {
        initPoint: 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-abc-123',
        preferenceId: 'pref-abc-123',
      },
    })
  })

  it('siempre usa init_point e ignora sandbox_init_point (MP ya no tiene sandbox)', async () => {
    mockPreferenceCreate.mockResolvedValue({
      id: 'pref-abc-123',
      init_point: 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-abc-123',
      sandbox_init_point: 'https://sandbox.mercadopago.com.ar/INVALID',
    })

    const { createPreference } = await import('@/lib/payments')
    const result = await createPreference(mockOrder)

    expect(result).toEqual({
      ok: true,
      data: {
        initPoint: 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-abc-123',
        preferenceId: 'pref-abc-123',
      },
    })
  })

  it('incluye el costo de envío en la preferencia (shipments.cost en pesos)', async () => {
    mockPreferenceCreate.mockResolvedValue({
      id: 'pref-abc-123',
      init_point: 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-abc-123',
    })

    const { createPreference } = await import('@/lib/payments')
    await createPreference(mockOrder)

    const body = mockPreferenceCreate.mock.calls[0][0].body
    // shippingCost 50000 centavos → 500 pesos
    expect(body.shipments).toEqual({ cost: 500, mode: 'not_specified' })
  })

  it('no envía notification_url — usa el webhook del panel (formato moderno firmado)', async () => {
    mockPreferenceCreate.mockResolvedValue({
      id: 'pref-abc-123',
      init_point: 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-abc-123',
    })

    const { createPreference } = await import('@/lib/payments')
    await createPreference(mockOrder)

    const body = mockPreferenceCreate.mock.calls[0][0].body
    expect(body.notification_url).toBeUndefined()
  })

  it('envía un idempotency key estable (order.id) al crear la preferencia', async () => {
    mockPreferenceCreate.mockResolvedValue({
      id: 'pref-abc-123',
      init_point: 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-abc-123',
    })

    const { createPreference } = await import('@/lib/payments')
    await createPreference(mockOrder)

    const requestOptions = mockPreferenceCreate.mock.calls[0][0].requestOptions
    expect(requestOptions?.idempotencyKey).toBe('order-uuid-1')
  })

  it('envía statement_descriptor para reducir desconocimientos/contracargos', async () => {
    mockPreferenceCreate.mockResolvedValue({
      id: 'pref-abc-123',
      init_point: 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-abc-123',
    })

    const { createPreference } = await import('@/lib/payments')
    await createPreference(mockOrder)

    const body = mockPreferenceCreate.mock.calls[0][0].body
    expect(body.statement_descriptor).toBe('AYLA')
  })

  it('divide el nombre del comprador en payer.name y payer.surname', async () => {
    mockPreferenceCreate.mockResolvedValue({
      id: 'pref-abc-123',
      init_point: 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-abc-123',
    })

    const { createPreference } = await import('@/lib/payments')
    await createPreference(mockOrder)

    const body = mockPreferenceCreate.mock.calls[0][0].body
    // 'Ana García' → name 'Ana', surname 'García'
    expect(body.payer.name).toBe('Ana')
    expect(body.payer.surname).toBe('García')
  })

  it('envía description en cada item de la preferencia', async () => {
    mockPreferenceCreate.mockResolvedValue({
      id: 'pref-abc-123',
      init_point: 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-abc-123',
    })

    const { createPreference } = await import('@/lib/payments')
    await createPreference(mockOrder)

    const body = mockPreferenceCreate.mock.calls[0][0].body
    expect(body.items[0].description).toBeTruthy()
  })

  it('returns { ok: false, error: string } when MP SDK throws', async () => {
    mockPreferenceCreate.mockRejectedValue(new Error('MP API down'))

    const { createPreference } = await import('@/lib/payments')
    const result = await createPreference(mockOrder)

    expect(result.ok).toBe(false)
    expect(typeof (result as { ok: false; error: string }).error).toBe('string')
    expect((result as { ok: false; error: string }).error).toContain('MP API down')
  })
})

describe('fetchPayment', () => {
  beforeEach(() => {
    vi.resetModules()
    mockPreferenceCreate.mockReset()
    mockPaymentGet.mockReset()
  })

  it('returns { ok: true, data: { status, amount, orderId } } on success', async () => {
    mockPaymentGet.mockResolvedValue({
      id: 99887766,
      status: 'approved',
      transaction_amount: 5500, // pesos
      external_reference: 'order-uuid-1',
    })

    const { fetchPayment } = await import('@/lib/payments')
    const result = await fetchPayment('99887766')

    expect(result).toEqual({
      ok: true,
      data: {
        status: 'approved',
        amount: 550000, // back to centavos: 5500 * 100
        orderId: 'order-uuid-1',
      },
    })
  })
})
