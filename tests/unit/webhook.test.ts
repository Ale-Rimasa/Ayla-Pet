import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createHmac } from 'crypto'

// ─── Mocks (all hoisted) ──────────────────────────────────────────────────────

const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockSelect = vi.fn()

// Chain: insert/update return { select/eq/then }
const chainAfterMutation = {
  select: mockSelect,
  eq: mockEq,
}
mockInsert.mockReturnValue(chainAfterMutation)
mockUpdate.mockReturnValue({ eq: mockEq })
mockEq.mockReturnValue(chainAfterMutation)
mockSelect.mockResolvedValue({ data: [], error: null }) // default: 0 rows = duplicate

const mockAdminFrom = vi.fn().mockReturnValue({
  insert: mockInsert,
  update: mockUpdate,
  select: mockSelect,
  eq: mockEq,
})

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}))

const mockFetchPayment = vi.fn()
vi.mock('@/lib/payments', () => ({
  fetchPayment: mockFetchPayment,
}))

const mockDecrementStock = vi.fn()
vi.mock('@/lib/db/stock', () => ({
  decrementStock: mockDecrementStock,
}))

const mockUpdateOrderStatus = vi.fn()
vi.mock('@/lib/db/orders', () => ({
  updateOrderStatus: mockUpdateOrderStatus,
  getOrderById: vi.fn().mockResolvedValue({
    id: 'order-uuid-1',
    status: 'pending',
    customer: { name: 'Ana', email: 'ana@test.com', phone: '123' },
    shippingAddress: { street: 'Calle 1', city: 'CABA', province: 'BA', postalCode: '1000' },
    items: [{ variantId: 'variant-1', quantity: 2, productName: 'Taza', variantName: 'Azul', unitPrice: 250000, subtotal: 500000, imageUrl: null, id: 'item-1', createdAt: '2026-01-01T00:00:00Z' }],
    subtotal: 500000,
    shippingCost: 50000,
    total: 550000,
    mpPreferenceId: null,
    mpPaymentId: null,
    notes: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  }),
}))

const mockSendOrderConfirmation = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/email', () => ({
  sendOrderConfirmation: mockSendOrderConfirmation,
}))

vi.mock('@/env', () => ({
  env: {
    MP_WEBHOOK_SECRET: 'test-webhook-secret',
    MP_ACCESS_TOKEN: 'TEST-token',
  },
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue(true),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WEBHOOK_SECRET = 'test-webhook-secret'
const PAYMENT_ID = '99887766'
const REQUEST_ID = 'req-uuid-abc'

function buildSignature(ts: string, paymentId: string, requestId: string, secret: string) {
  const manifest = `id:${paymentId};request-id:${requestId};ts:${ts};`
  return createHmac('sha256', secret).update(manifest).digest('hex')
}

function buildValidRequest(
  paymentId = PAYMENT_ID,
  requestId = REQUEST_ID,
  secret = WEBHOOK_SECRET,
  type = 'payment'
) {
  const ts = String(Date.now())
  const hmac = buildSignature(ts, paymentId, requestId, secret)
  const url = `https://jengibreaqua.com/api/webhooks/mercadopago?id=${paymentId}&type=${type}&topic=payment`

  const req = new Request(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-signature': `ts=${ts},v1=${hmac}`,
      'x-request-id': requestId,
    },
    body: JSON.stringify({ action: 'payment.updated', data: { id: paymentId } }),
  })
  return req
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/webhooks/mercadopago', () => {
  beforeEach(() => {
    vi.resetModules()
    mockFetchPayment.mockReset()
    mockDecrementStock.mockReset()
    mockUpdateOrderStatus.mockReset()
    mockSendOrderConfirmation.mockReset()
    mockInsert.mockReset()
    mockSelect.mockReset()
    mockEq.mockReset()
    mockAdminFrom.mockReset()

    // Re-wire chain after reset
    mockEq.mockReturnValue({ select: mockSelect, eq: mockEq })
    mockInsert.mockReturnValue({ select: mockSelect, eq: mockEq })
    mockUpdate.mockReturnValue({ eq: mockEq })
    mockAdminFrom.mockReturnValue({
      insert: mockInsert,
      update: mockUpdate,
      select: mockSelect,
      eq: mockEq,
    })
    // Restore default so tests that don't set mockSelect explicitly don't get undefined
    mockSelect.mockResolvedValue({ data: [], error: null })

    mockDecrementStock.mockResolvedValue({ ok: true })
    mockUpdateOrderStatus.mockResolvedValue({ ok: true })
    mockSendOrderConfirmation.mockResolvedValue(undefined)
  })

  it('valid sig + approved → calls decrementStock, updateOrderStatus("paid"), sendOrderConfirmation', async () => {
    // Simulate newly inserted row (not duplicate)
    mockSelect.mockResolvedValue({ data: [{ id: 'payment-row-id' }], error: null })

    mockFetchPayment.mockResolvedValue({
      ok: true,
      data: { status: 'approved', amount: 550000, orderId: 'order-uuid-1' },
    })

    const { POST } = await import('@/app/api/webhooks/mercadopago/route')
    const res = await POST(buildValidRequest() as any)

    expect(res.status).toBe(200)
    expect(mockDecrementStock).toHaveBeenCalledOnce()
    expect(mockUpdateOrderStatus).toHaveBeenCalledWith('order-uuid-1', 'paid')
    expect(mockSendOrderConfirmation).toHaveBeenCalledOnce()
  })

  it('valid sig + rejected → 200, no side effects', async () => {
    // Simulate newly inserted row
    mockSelect.mockResolvedValue({ data: [{ id: 'payment-row-id' }], error: null })

    mockFetchPayment.mockResolvedValue({
      ok: true,
      data: { status: 'rejected', amount: 550000, orderId: 'order-uuid-1' },
    })

    const { POST } = await import('@/app/api/webhooks/mercadopago/route')
    const res = await POST(buildValidRequest() as any)

    expect(res.status).toBe(200)
    expect(mockDecrementStock).not.toHaveBeenCalled()
    expect(mockUpdateOrderStatus).not.toHaveBeenCalled()
    expect(mockSendOrderConfirmation).not.toHaveBeenCalled()
  })

  it('invalid signature → 200, no side effects', async () => {
    const req = buildValidRequest(PAYMENT_ID, REQUEST_ID, 'wrong-secret')

    const { POST } = await import('@/app/api/webhooks/mercadopago/route')
    const res = await POST(req as any)

    expect(res.status).toBe(200)
    expect(mockFetchPayment).not.toHaveBeenCalled()
    expect(mockDecrementStock).not.toHaveBeenCalled()
    expect(mockUpdateOrderStatus).not.toHaveBeenCalled()
  })

  it('duplicate payment_id (idempotency) → 200, no-op', async () => {
    // Simulate empty rows = conflict / duplicate (ON CONFLICT DO NOTHING)
    mockSelect.mockResolvedValue({ data: [], error: null })

    mockFetchPayment.mockResolvedValue({
      ok: true,
      data: { status: 'approved', amount: 550000, orderId: 'order-uuid-1' },
    })

    const { POST } = await import('@/app/api/webhooks/mercadopago/route')
    const res = await POST(buildValidRequest() as any)

    expect(res.status).toBe(200)
    expect(mockDecrementStock).not.toHaveBeenCalled()
    expect(mockUpdateOrderStatus).not.toHaveBeenCalled()
    expect(mockSendOrderConfirmation).not.toHaveBeenCalled()
  })
})
