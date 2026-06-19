import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { Order } from '@/types'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetOrderById = vi.fn()
const mockUpdateOrderStatus = vi.fn()
const mockGetTransferInfo = vi.fn()
const mockFetchPayment = vi.fn()
const mockRedirect = vi.fn((_url: string): never => {
  throw new Error('NEXT_REDIRECT')
})

vi.mock('next/navigation', () => ({
  redirect: (url: string) => mockRedirect(url),
}))

vi.mock('@/lib/db/orders', () => ({
  getOrderById: (id: string) => mockGetOrderById(id),
  updateOrderStatus: (...args: unknown[]) => mockUpdateOrderStatus(...args),
}))

vi.mock('@/lib/db/site-settings', () => ({
  getTransferInfo: () => mockGetTransferInfo(),
}))

vi.mock('@/lib/payments', () => ({
  fetchPayment: (id: string) => mockFetchPayment(id),
}))

// Passthrough so we can inspect the props the page hands to the client.
vi.mock('@/app/(storefront)/checkout/confirmacion/ConfirmacionClient', () => ({
  ConfirmacionClient: (props: unknown) => props,
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ORDER_ID = 'order-uuid-1'

function makeOrder(status: Order['status']): Order {
  return {
    id: ORDER_ID,
    status,
    customer: { name: 'Ana', email: 'ana@test.com', phone: '111' },
    shippingAddress: { street: 'X', city: 'CABA', province: 'BA', postalCode: '1043' },
    items: [],
    subtotal: 500000,
    shippingCost: 50000,
    total: 550000,
    mpPreferenceId: null,
    mpPaymentId: null,
    notes: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  }
}

const TRANSFER_INFO = { cbu: '0', alias: 'a', titular: 'T', banco: 'B' }

async function renderPage(searchParams: Record<string, string>) {
  const { default: ConfirmacionPage } = await import(
    '@/app/(storefront)/checkout/confirmacion/page'
  )
  const element = (await ConfirmacionPage({
    searchParams: Promise.resolve(searchParams),
  })) as { props: { order: Order; mpStatus: string | null; transferInfo: typeof TRANSFER_INFO } }
  return element.props
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ConfirmacionPage — payment status is resolved server-side', () => {
  beforeEach(() => {
    vi.resetModules()
    mockGetOrderById.mockReset()
    mockUpdateOrderStatus.mockReset()
    mockGetTransferInfo.mockReset()
    mockFetchPayment.mockReset()
    mockRedirect.mockClear()
    mockGetTransferInfo.mockResolvedValue(TRANSFER_INFO)
  })

  it('ignores a forged ?status=approved and falls back to the order status', async () => {
    mockGetOrderById.mockResolvedValue(makeOrder('pending'))

    const props = await renderPage({
      external_reference: ORDER_ID,
      status: 'approved', // forged by the user
    })

    expect(props.mpStatus).toBe('pending')
    expect(mockFetchPayment).not.toHaveBeenCalled()
  })

  it('uses the real MP status when payment_id belongs to this order', async () => {
    mockGetOrderById.mockResolvedValue(makeOrder('pending'))
    mockFetchPayment.mockResolvedValue({
      ok: true,
      data: { status: 'approved', amount: 550000, orderId: ORDER_ID },
    })

    const props = await renderPage({
      external_reference: ORDER_ID,
      status: 'approved',
      payment_id: '12345',
    })

    expect(mockFetchPayment).toHaveBeenCalledWith('12345')
    expect(props.mpStatus).toBe('approved')
  })

  it('ignores a payment_id that belongs to a different order', async () => {
    mockGetOrderById.mockResolvedValue(makeOrder('pending'))
    mockFetchPayment.mockResolvedValue({
      ok: true,
      data: { status: 'approved', amount: 999, orderId: 'someone-elses-order' },
    })

    const props = await renderPage({
      external_reference: ORDER_ID,
      payment_id: '12345',
    })

    expect(props.mpStatus).toBe('pending')
  })

  it('maps a paid order to approved even without a payment_id (webhook already fired)', async () => {
    mockGetOrderById.mockResolvedValue(makeOrder('paid'))

    const props = await renderPage({ external_reference: ORDER_ID })

    expect(props.mpStatus).toBe('approved')
  })

  it('returns mpStatus=null for the manual transfer flow (?orderId=)', async () => {
    mockGetOrderById.mockResolvedValue(makeOrder('pending'))

    const props = await renderPage({ orderId: ORDER_ID })

    expect(props.mpStatus).toBeNull()
    expect(mockFetchPayment).not.toHaveBeenCalled()
  })
})
