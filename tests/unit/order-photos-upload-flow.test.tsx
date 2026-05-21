import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Order } from '@/types'

vi.mock('@/store/cart.store', () => ({
  useCartStore: (selector: any) => selector({ clearCart: vi.fn() }),
}))

vi.mock('@/store/checkout.store', () => ({
  useCheckoutStore: (selector: any) => selector({ resetCheckout: vi.fn() }),
}))

// navigator.clipboard mock
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
})

const PENDING_ORDER: Order = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  status: 'pending',
  items: [],
  customer: { name: 'Test User', email: 'test@example.com', phone: '1234' },
  shippingAddress: { street: 'Av Test 123', city: 'Buenos Aires', province: 'CABA', postalCode: '1000' },
  subtotal: 10000,
  shippingCost: 0,
  total: 10000,
  mpPreferenceId: null,
  mpPaymentId: null,
  notes: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('ConfirmacionClient — bank transfer flow', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('CTA "Subir mis fotos" is present and points to /mi-pedido/<id>/fotos', async () => {
    const { ConfirmacionClient } = await import('@/app/(storefront)/checkout/confirmacion/ConfirmacionClient')
    render(<ConfirmacionClient order={PENDING_ORDER} />)

    const ctaLink = screen.getByRole('link', { name: /subir mis fotos/i })
    expect(ctaLink).toBeDefined()
    expect(ctaLink.getAttribute('href')).toBe(`/mi-pedido/${PENDING_ORDER.id}/fotos`)
  })

  it('shows bank transfer data (CBU and Alias rows)', async () => {
    const { ConfirmacionClient } = await import('@/app/(storefront)/checkout/confirmacion/ConfirmacionClient')
    render(<ConfirmacionClient order={PENDING_ORDER} />)

    expect(screen.getByText('CBU')).toBeDefined()
    expect(screen.getByText('Alias')).toBeDefined()
  })

  it('shows the order number in the page', async () => {
    const { ConfirmacionClient } = await import('@/app/(storefront)/checkout/confirmacion/ConfirmacionClient')
    render(<ConfirmacionClient order={PENDING_ORDER} />)

    const shortId = PENDING_ORDER.id.slice(0, 8).toUpperCase()
    expect(screen.getAllByText(new RegExp(shortId)).length).toBeGreaterThan(0)
  })
})
