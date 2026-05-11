import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useCartStore } from '@/store/cart.store'
import type { CartItem } from '@/types'

// Mock child components that would require complex setup
vi.mock('@/components/shared/QuantitySelector', () => ({
  QuantitySelector: ({ value, max }: { value: number; max?: number }) => (
    <div data-testid="quantity-selector" data-value={value} data-max={max ?? ''}>
      <button aria-label="Reducir cantidad">-</button>
      <span>{value}</span>
      <button aria-label="Aumentar cantidad" disabled={max !== undefined && value >= max}>+</button>
    </div>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, 'aria-label': ariaLabel }: {
    children?: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    'aria-label'?: string
  }) => (
    <button onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      {children}
    </button>
  ),
}))

const baseItem: CartItem = {
  id: 'prod-1',
  variantId: 'variant-1',
  name: 'Chapa grabada',
  price: 2500,
  quantity: 1,
  imageUrl: '',
}

beforeEach(() => {
  useCartStore.setState({ items: [], isCartOpen: false })
})

describe('CartTable', () => {
  it('renders null when cart is empty', async () => {
    useCartStore.setState({ items: [] })
    const { CartTable } = await import('@/components/cart/CartTable')
    const { container } = render(<CartTable />)
    expect(container.firstChild).toBeNull()
  })

  it('passes max quantity from maxQuantityMap to QuantitySelector', async () => {
    useCartStore.setState({ items: [baseItem] })
    const { CartTable } = await import('@/components/cart/CartTable')
    render(<CartTable maxQuantityMap={{ 'variant-1': 3 }} />)

    const selector = screen.getByTestId('quantity-selector')
    expect(selector).toBeInTheDocument()
    expect(selector).toHaveAttribute('data-max', '3')
  })
})
