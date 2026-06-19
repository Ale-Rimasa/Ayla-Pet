/**
 * S1–S8 — dispatchOrder server action
 *
 * Strict TDD: tests written RED first, then T14 makes them GREEN.
 *
 * Mock strategy:
 *  - vi.doMock + vi.resetModules() in beforeEach (same pattern as orders.test.ts)
 *  - @/lib/auth → requireAdmin (throws for S2, returns user for rest)
 *  - @/lib/db/orders → getOrderById + updateOrderStatus (aliased as dbUpdateOrderStatus)
 *  - @/lib/email → sendOrderShipped
 *  - next/cache → revalidatePath, revalidateTag
 *
 * S6 is modeled by dbUpdateOrderStatus returning { ok: false }, NOT throwing.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { Order } from '@/types'

const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

const PROCESSING_ORDER: Order = {
  id: VALID_UUID,
  status: 'processing',
  customer: {
    name: 'Ana García',
    email: 'ana@example.com',
    phone: '1155551234',
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
      productName: 'Chapa personalizada',
      variantName: 'Redonda',
      unitPrice: 250000,
      quantity: 1,
      subtotal: 250000,
      imageUrl: null,
      createdAt: '2026-01-01T00:00:00Z',
    },
  ],
  subtotal: 250000,
  shippingCost: 50000,
  total: 300000,
  mpPreferenceId: null,
  mpPaymentId: null,
  notes: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

// ── S2: unauthorized ─────────────────────────────────────────────────────────

describe('dispatchOrder — S2: unauthorized', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('S2: throws when requireAdmin rejects, without touching DB or email', async () => {
    const getOrderById = vi.fn()
    const sendOrderShipped = vi.fn()

    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockRejectedValue(new Error('Unauthorized')),
    }))
    vi.doMock('@/lib/db/orders', () => ({
      getOrderById,
      updateOrderStatus: vi.fn(),
    }))
    vi.doMock('@/lib/email', () => ({
      sendOrderShipped,
    }))
    vi.doMock('next/cache', () => ({
      revalidatePath: vi.fn(),
      revalidateTag: vi.fn(),
    }))

    const { dispatchOrder } = await import('@/lib/actions/orders')

    // requireAdmin propagates its rejection — the action must not swallow it.
    await expect(dispatchOrder(VALID_UUID)).rejects.toThrow()

    expect(getOrderById).not.toHaveBeenCalled()
    expect(sendOrderShipped).not.toHaveBeenCalled()
  })
})

// ── S3: invalid input ────────────────────────────────────────────────────────

describe('dispatchOrder — S3: invalid input', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('S3: returns invalid-input for non-UUID orderId', async () => {
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-uuid' }),
    }))
    const getOrderById = vi.fn()
    const dbUpdateOrderStatus = vi.fn()
    vi.doMock('@/lib/db/orders', () => ({
      getOrderById,
      updateOrderStatus: dbUpdateOrderStatus,
    }))
    vi.doMock('@/lib/email', () => ({
      sendOrderShipped: vi.fn(),
    }))
    vi.doMock('next/cache', () => ({
      revalidatePath: vi.fn(),
      revalidateTag: vi.fn(),
    }))

    const { dispatchOrder } = await import('@/lib/actions/orders')
    const result = await dispatchOrder('not-a-uuid')

    expect(result).toEqual({ ok: false, error: 'invalid-input' })
    expect(getOrderById).not.toHaveBeenCalled()
    expect(dbUpdateOrderStatus).not.toHaveBeenCalled()
  })
})

// ── S4: order not found ──────────────────────────────────────────────────────

describe('dispatchOrder — S4: order not found', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('S4: returns not-found when getOrderById returns null', async () => {
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-uuid' }),
    }))
    const dbUpdateOrderStatus = vi.fn()
    const sendOrderShipped = vi.fn()
    vi.doMock('@/lib/db/orders', () => ({
      getOrderById: vi.fn().mockResolvedValue(null),
      updateOrderStatus: dbUpdateOrderStatus,
    }))
    vi.doMock('@/lib/email', () => ({
      sendOrderShipped,
    }))
    vi.doMock('next/cache', () => ({
      revalidatePath: vi.fn(),
      revalidateTag: vi.fn(),
    }))

    const { dispatchOrder } = await import('@/lib/actions/orders')
    const result = await dispatchOrder(VALID_UUID)

    expect(result).toEqual({ ok: false, error: 'not-found' })
    expect(dbUpdateOrderStatus).not.toHaveBeenCalled()
    expect(sendOrderShipped).not.toHaveBeenCalled()
  })
})

// ── S5: wrong status ─────────────────────────────────────────────────────────

describe('dispatchOrder — S5: wrong status (not processing)', () => {
  const wrongStatuses = ['paid', 'shipped', 'pending', 'cancelled'] as const

  beforeEach(() => {
    vi.resetModules()
  })

  wrongStatuses.forEach((badStatus) => {
    it(`S5: returns invalid-transition for status="${badStatus}"`, async () => {
      vi.doMock('@/lib/auth', () => ({
        requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-uuid' }),
      }))
      const dbUpdateOrderStatus = vi.fn()
      const sendOrderShipped = vi.fn()
      vi.doMock('@/lib/db/orders', () => ({
        getOrderById: vi.fn().mockResolvedValue({ ...PROCESSING_ORDER, status: badStatus }),
        updateOrderStatus: dbUpdateOrderStatus,
      }))
      vi.doMock('@/lib/email', () => ({
        sendOrderShipped,
      }))
      vi.doMock('next/cache', () => ({
        revalidatePath: vi.fn(),
        revalidateTag: vi.fn(),
      }))

      const { dispatchOrder } = await import('@/lib/actions/orders')
      const result = await dispatchOrder(VALID_UUID)

      expect(result).toEqual({ ok: false, error: 'invalid-transition' })
      expect(dbUpdateOrderStatus).not.toHaveBeenCalled()
      expect(sendOrderShipped).not.toHaveBeenCalled()
    })
  })
})

// ── S6: transition fails ─────────────────────────────────────────────────────

describe('dispatchOrder — S6: DB transition fails', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('S6: returns transition-failed when dbUpdateOrderStatus returns { ok: false }', async () => {
    const revalidatePath = vi.fn()
    const revalidateTag = vi.fn()
    const sendOrderShipped = vi.fn()

    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-uuid' }),
    }))
    vi.doMock('@/lib/db/orders', () => ({
      getOrderById: vi.fn().mockResolvedValue(PROCESSING_ORDER),
      updateOrderStatus: vi.fn().mockResolvedValue({ ok: false, error: 'from_status_mismatch' }),
    }))
    vi.doMock('@/lib/email', () => ({
      sendOrderShipped,
    }))
    vi.doMock('next/cache', () => ({
      revalidatePath,
      revalidateTag,
    }))

    const { dispatchOrder } = await import('@/lib/actions/orders')
    const result = await dispatchOrder(VALID_UUID)

    expect(result).toEqual({ ok: false, error: 'transition-failed' })
    expect(sendOrderShipped).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
    expect(revalidateTag).not.toHaveBeenCalled()
  })
})

// ── S7: email fails ──────────────────────────────────────────────────────────

describe('dispatchOrder — S7: email fails', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('S7: returns { ok: true, emailSent: false } and still revalidates', async () => {
    const revalidatePath = vi.fn()
    const revalidateTag = vi.fn()
    const dbUpdateOrderStatus = vi.fn().mockResolvedValue({ ok: true })
    const sendOrderShipped = vi.fn().mockResolvedValue({ sent: false })

    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-uuid' }),
    }))
    vi.doMock('@/lib/db/orders', () => ({
      getOrderById: vi.fn().mockResolvedValue(PROCESSING_ORDER),
      updateOrderStatus: dbUpdateOrderStatus,
    }))
    vi.doMock('@/lib/email', () => ({
      sendOrderShipped,
    }))
    vi.doMock('next/cache', () => ({
      revalidatePath,
      revalidateTag,
    }))

    const { dispatchOrder } = await import('@/lib/actions/orders')
    const result = await dispatchOrder(VALID_UUID)

    expect(result).toEqual({ ok: true, emailSent: false })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/pedidos')
    expect(revalidateTag).toHaveBeenCalledWith(`pedido:${VALID_UUID}`, {})
    // No compensating DB call
    expect(dbUpdateOrderStatus).toHaveBeenCalledTimes(1)
  })
})

// ── S1: happy path ───────────────────────────────────────────────────────────

describe('dispatchOrder — S1: happy path', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('S1: full happy path returns { ok: true, emailSent: true }', async () => {
    const revalidatePath = vi.fn()
    const revalidateTag = vi.fn()
    const dbUpdateOrderStatus = vi.fn().mockResolvedValue({ ok: true })
    const sendOrderShipped = vi.fn().mockResolvedValue({ sent: true })

    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-uuid' }),
    }))
    vi.doMock('@/lib/db/orders', () => ({
      getOrderById: vi.fn().mockResolvedValue(PROCESSING_ORDER),
      updateOrderStatus: dbUpdateOrderStatus,
    }))
    vi.doMock('@/lib/email', () => ({
      sendOrderShipped,
    }))
    vi.doMock('next/cache', () => ({
      revalidatePath,
      revalidateTag,
    }))

    const { dispatchOrder } = await import('@/lib/actions/orders')
    const result = await dispatchOrder(VALID_UUID)

    expect(result).toEqual({ ok: true, emailSent: true })

    // dbUpdateOrderStatus called with correct args
    expect(dbUpdateOrderStatus).toHaveBeenCalledWith(
      VALID_UUID,
      'processing',
      'shipped',
      'admin-uuid'
    )

    // sendOrderShipped called with the full order
    expect(sendOrderShipped).toHaveBeenCalledOnce()
    expect(sendOrderShipped).toHaveBeenCalledWith(PROCESSING_ORDER)

    // Cache invalidated
    expect(revalidatePath).toHaveBeenCalledWith('/admin/pedidos')
    expect(revalidateTag).toHaveBeenCalledWith(`pedido:${VALID_UUID}`, {})
  })
})

// ── S8: race / double dispatch ───────────────────────────────────────────────

describe('dispatchOrder — S8: race / double dispatch', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('S8: second concurrent call returns transition-failed; email called at most once', async () => {
    const revalidatePath = vi.fn()
    const revalidateTag = vi.fn()
    const sendOrderShipped = vi.fn().mockResolvedValue({ sent: true })

    // First call succeeds, second fails (race guard on RPC)
    const dbUpdateOrderStatus = vi.fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, error: 'from_status_mismatch' })

    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-uuid' }),
    }))
    vi.doMock('@/lib/db/orders', () => ({
      getOrderById: vi.fn().mockResolvedValue(PROCESSING_ORDER),
      updateOrderStatus: dbUpdateOrderStatus,
    }))
    vi.doMock('@/lib/email', () => ({
      sendOrderShipped,
    }))
    vi.doMock('next/cache', () => ({
      revalidatePath,
      revalidateTag,
    }))

    const { dispatchOrder } = await import('@/lib/actions/orders')

    const [first, second] = await Promise.all([
      dispatchOrder(VALID_UUID),
      dispatchOrder(VALID_UUID),
    ])

    const results = [first, second]
    const successCount = results.filter((r) => r.ok === true).length
    const failCount = results.filter((r) => r.ok === false).length

    expect(successCount).toBe(1)
    expect(failCount).toBe(1)

    const failResult = results.find((r) => r.ok === false)
    expect(failResult).toEqual({ ok: false, error: 'transition-failed' })

    // Email sent at most once
    expect(sendOrderShipped).toHaveBeenCalledTimes(1)
  })
})
