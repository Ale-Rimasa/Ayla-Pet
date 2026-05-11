import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useCartStore } from '@/store/cart.store'
import type { CartItem } from '@/types'

vi.mock('@/lib/actions/cart', () => ({
  getVariantsStockAction: vi.fn().mockResolvedValue({}),
  validateCartBeforeCheckout: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock('@/components/cart/CartTable', () => ({
  CartTable: () => <div data-testid="cart-table">CartTable</div>,
}))

vi.mock('@/components/cart/CartSummary', () => ({
  CartSummary: () => <div data-testid="cart-summary">CartSummary</div>,
}))

vi.mock('@/components/shared/TrustBar', () => ({
  TrustBar: () => <div data-testid="trust-bar">TrustBar</div>,
}))

vi.mock('@/components/ui/button', () => ({
  buttonVariants: () => 'btn',
}))

const baseItem: CartItem = {
  id: 'prod-1',
  variantId: 'variant-1',
  name: 'Chapa grabada',
  price: 250000,
  quantity: 1,
  imageUrl: '',
}

beforeEach(() => {
  useCartStore.setState({ items: [], isCartOpen: false })
})

describe('CartClientShell', () => {
  it('shows empty state when cart is empty', async () => {
    useCartStore.setState({ items: [] })
    const { CartClientShell } = await import('@/components/cart/CartClientShell')
    render(<CartClientShell />)

    expect(screen.getByText('Tu carrito está vacío')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver productos' })).toBeInTheDocument()
  })

  it('shows cart content when items are present', async () => {
    useCartStore.setState({ items: [baseItem] })
    const { CartClientShell } = await import('@/components/cart/CartClientShell')
    render(<CartClientShell />)

    expect(screen.getByRole('heading', { name: 'Tu carrito' })).toBeInTheDocument()
    expect(screen.getByTestId('cart-table')).toBeInTheDocument()
    expect(screen.getByTestId('cart-summary')).toBeInTheDocument()
  })
})
