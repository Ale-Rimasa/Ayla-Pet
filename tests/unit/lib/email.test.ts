/**
 * S9 / S10 — email module tests
 *
 * S9: sendEmail swallows Resend errors and returns { sent: false }
 * S10: sendOrderConfirmation keeps its fire-and-forget void contract
 *      even when Resend fails
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { Order } from '@/types'

// Fixture order used across tests
const FIXTURE_ORDER: Order = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  status: 'paid',
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

// ── Mock Resend ──────────────────────────────────────────────────────────────
const mockEmailsSend = vi.fn()

vi.mock('resend', () => {
  return {
    Resend: vi.fn(function () {
      return {
        emails: {
          send: mockEmailsSend,
        },
      }
    }),
  }
})

// ── Tests ────────────────────────────────────────────────────────────────────

describe('sendEmail (S9)', () => {
  beforeEach(() => {
    mockEmailsSend.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('S9 — positive: returns { sent: true } when Resend succeeds', async () => {
    mockEmailsSend.mockResolvedValue({ id: 'resend-id-123' })

    const { sendEmail } = await import('@/lib/email')
    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test subject',
      text: 'Test body',
    })

    expect(result).toEqual({ sent: true })
    expect(mockEmailsSend).toHaveBeenCalledOnce()
  })

  it('S9 — negative: returns { sent: false } and logs when Resend throws', async () => {
    const resendError = new Error('Resend API unavailable')
    mockEmailsSend.mockRejectedValue(resendError)

    const consoleSpy = vi.spyOn(console, 'error')

    const { sendEmail } = await import('@/lib/email')
    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test subject',
      text: 'Test body',
    })

    expect(result).toEqual({ sent: false })
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[email]'),
      expect.any(Error)
    )
  })

  it('S9 — negative: does NOT re-throw on Resend error', async () => {
    mockEmailsSend.mockRejectedValue(new Error('Network failure'))

    const { sendEmail } = await import('@/lib/email')
    // Must resolve, not reject
    await expect(
      sendEmail({ to: 'test@example.com', subject: 'Subject', text: 'Body' })
    ).resolves.toEqual({ sent: false })
  })
})

describe('sendOrderShipped (S9-adjacent, T07/T08)', () => {
  beforeEach(() => {
    mockEmailsSend.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('calls sendEmail with order customer email', async () => {
    mockEmailsSend.mockResolvedValue({ id: 'resend-id-789' })

    const { sendOrderShipped } = await import('@/lib/email')
    await sendOrderShipped(FIXTURE_ORDER)

    expect(mockEmailsSend).toHaveBeenCalledOnce()
    const callArgs = mockEmailsSend.mock.calls[0][0]
    expect(callArgs.to).toBe(FIXTURE_ORDER.customer.email)
  })

  it('subject includes the order short-id', async () => {
    mockEmailsSend.mockResolvedValue({ id: 'resend-id-790' })

    const { sendOrderShipped } = await import('@/lib/email')
    await sendOrderShipped(FIXTURE_ORDER)

    const callArgs = mockEmailsSend.mock.calls[0][0]
    const shortId = FIXTURE_ORDER.id.slice(0, 8).toUpperCase()
    expect(callArgs.subject).toContain(shortId)
  })

  it('returns { sent: true } when sendEmail resolves', async () => {
    mockEmailsSend.mockResolvedValue({ id: 'resend-id-791' })

    const { sendOrderShipped } = await import('@/lib/email')
    const result = await sendOrderShipped(FIXTURE_ORDER)

    expect(result).toEqual({ sent: true })
  })

  it('returns { sent: false } when Resend fails', async () => {
    mockEmailsSend.mockRejectedValue(new Error('Resend down'))

    const { sendOrderShipped } = await import('@/lib/email')
    const result = await sendOrderShipped(FIXTURE_ORDER)

    expect(result).toEqual({ sent: false })
  })
})

describe('renderEmail seam (S10 content assertion)', () => {
  beforeEach(() => {
    mockEmailsSend.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('order-confirmation text includes shortId and brand name', async () => {
    mockEmailsSend.mockResolvedValue({ id: 'resend-id-792' })

    const { sendOrderConfirmation } = await import('@/lib/email')
    await sendOrderConfirmation(FIXTURE_ORDER)

    const callArgs = mockEmailsSend.mock.calls[0][0]
    const shortId = FIXTURE_ORDER.id.slice(0, 8).toUpperCase()
    expect(callArgs.text).toContain(shortId)
    expect(callArgs.text).toContain('Ayla')
  })

  it('order-shipped text includes shortId and brand name', async () => {
    mockEmailsSend.mockResolvedValue({ id: 'resend-id-793' })

    const { sendOrderShipped } = await import('@/lib/email')
    await sendOrderShipped(FIXTURE_ORDER)

    const callArgs = mockEmailsSend.mock.calls[0][0]
    const shortId = FIXTURE_ORDER.id.slice(0, 8).toUpperCase()
    expect(callArgs.text).toContain(shortId)
    expect(callArgs.text).toContain('Ayla')
  })
})

describe('sendOrderConfirmation (S10)', () => {
  beforeEach(() => {
    mockEmailsSend.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('S10: resolves void even when Resend fails (fire-and-forget contract)', async () => {
    mockEmailsSend.mockRejectedValue(new Error('Resend down'))

    const { sendOrderConfirmation } = await import('@/lib/email')
    // Must resolve to undefined, not reject
    await expect(sendOrderConfirmation(FIXTURE_ORDER)).resolves.toBeUndefined()
  })

  it('S10: calls sendEmail with order customer email', async () => {
    mockEmailsSend.mockResolvedValue({ id: 'resend-id-456' })

    const { sendOrderConfirmation } = await import('@/lib/email')
    await sendOrderConfirmation(FIXTURE_ORDER)

    expect(mockEmailsSend).toHaveBeenCalledOnce()
    const callArgs = mockEmailsSend.mock.calls[0][0]
    expect(callArgs.to).toBe(FIXTURE_ORDER.customer.email)
  })
})
