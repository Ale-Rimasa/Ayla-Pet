import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useCartStore } from '@/store/cart.store'
import { AddToCartButton } from '@/components/product/AddToCartButton'
import type { CartItem } from '@/types'

const baseItem: Omit<CartItem, 'quantity'> = {
  id: 'prod-1',
  variantId: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Chapa grabada',
  price: 2500,
  imageUrl: '/chapa.jpg',
}

beforeEach(() => {
  useCartStore.setState({ items: [], isCartOpen: false })
})

describe('AddToCartButton — stock gate', () => {
  it('shows "Sin stock" and is disabled when stock is 0', () => {
    render(<AddToCartButton item={baseItem} stock={0} />)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent('Sin stock')
  })

  it('is enabled and shows "Agregar al carrito" when stock is available and cart is empty', () => {
    render(<AddToCartButton item={baseItem} stock={5} />)
    const button = screen.getByRole('button')
    expect(button).not.toBeDisabled()
    expect(button).toHaveTextContent('Agregar al carrito')
  })

  it('is disabled when cartQty + newQty would exceed available stock', () => {
    // Pre-load cart with 3 units of this variant (stock is 3, so adding 1 more = 4 > 3)
    useCartStore.setState({
      items: [{ ...baseItem, quantity: 3 }],
      isCartOpen: false,
    })

    render(<AddToCartButton item={baseItem} quantity={1} stock={3} />)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('is enabled when cartQty + newQty is exactly equal to stock', () => {
    // Pre-load cart with 2 units (stock is 3, adding 1 more = 3 = stock → still allowed)
    useCartStore.setState({
      items: [{ ...baseItem, quantity: 2 }],
      isCartOpen: false,
    })

    render(<AddToCartButton item={baseItem} quantity={1} stock={3} />)
    const button = screen.getByRole('button')
    expect(button).not.toBeDisabled()
  })

  it('does NOT call addItem when button is clicked in would-exceed state', () => {
    useCartStore.setState({
      items: [{ ...baseItem, quantity: 5 }],
      isCartOpen: false,
    })

    render(<AddToCartButton item={baseItem} quantity={1} stock={5} />)
    const button = screen.getByRole('button')

    // Button should be disabled — click should have no effect
    fireEvent.click(button)

    // Cart should still have only 5 (no additional quantity added)
    const state = useCartStore.getState()
    const cartItem = state.items.find((i) => i.variantId === baseItem.variantId)
    expect(cartItem?.quantity).toBe(5)
  })
})
