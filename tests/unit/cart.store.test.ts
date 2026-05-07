import { describe, it, expect, beforeEach } from 'vitest'
import { useCartStore } from '@/store/cart.store'
import type { CartItem } from '@/types'

const makeItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  id: 'prod-1',
  variantId: 'variant-1',
  name: 'Taza cerámica',
  price: 2500, // 2500 centavos = ARS 25
  quantity: 1,
  imageUrl: '/taza.jpg',
  ...overrides,
})

beforeEach(() => {
  useCartStore.setState({ items: [] })
})

describe('cart store — initial state', () => {
  it('starts with an empty items array', () => {
    expect(useCartStore.getState().items).toEqual([])
  })

  it('totalPrice() returns 0 when cart is empty', () => {
    expect(useCartStore.getState().totalPrice()).toBe(0)
  })
})

describe('addItem', () => {
  it('adds a new item to the cart', () => {
    const item = makeItem()
    useCartStore.getState().addItem(item)
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().items[0]).toEqual(item)
  })

  it('increments quantity when adding an already-present item', () => {
    const item = makeItem({ quantity: 1 })
    useCartStore.getState().addItem(item)
    useCartStore.getState().addItem(item)
    const items = useCartStore.getState().items
    expect(items).toHaveLength(1)
    expect(items[0].quantity).toBe(2)
  })

  it('adds a different variantId as a separate item', () => {
    useCartStore.getState().addItem(makeItem({ variantId: 'variant-1' }))
    useCartStore.getState().addItem(makeItem({ variantId: 'variant-2' }))
    expect(useCartStore.getState().items).toHaveLength(2)
  })
})

describe('removeItem', () => {
  it('removes the item with the given variantId', () => {
    useCartStore.getState().addItem(makeItem({ variantId: 'variant-1' }))
    useCartStore.getState().addItem(makeItem({ variantId: 'variant-2' }))
    useCartStore.getState().removeItem('variant-1')
    const items = useCartStore.getState().items
    expect(items).toHaveLength(1)
    expect(items[0].variantId).toBe('variant-2')
  })

  it('does nothing when the variantId is not in the cart', () => {
    useCartStore.getState().addItem(makeItem())
    useCartStore.getState().removeItem('non-existent')
    expect(useCartStore.getState().items).toHaveLength(1)
  })
})

describe('updateQuantity', () => {
  it('updates the quantity of the correct item', () => {
    useCartStore.getState().addItem(makeItem({ variantId: 'variant-1', quantity: 1 }))
    useCartStore.getState().addItem(makeItem({ variantId: 'variant-2', quantity: 1 }))
    useCartStore.getState().updateQuantity('variant-1', 5)
    const items = useCartStore.getState().items
    expect(items.find((i) => i.variantId === 'variant-1')?.quantity).toBe(5)
    expect(items.find((i) => i.variantId === 'variant-2')?.quantity).toBe(1)
  })
})

describe('clearCart', () => {
  it('empties the items array', () => {
    useCartStore.getState().addItem(makeItem())
    useCartStore.getState().clearCart()
    expect(useCartStore.getState().items).toEqual([])
  })
})

describe('totalPrice', () => {
  it('sums price × quantity for a single item', () => {
    // 2500 centavos × 2 = 5000
    useCartStore.getState().addItem(makeItem({ price: 2500, quantity: 2 }))
    expect(useCartStore.getState().totalPrice()).toBe(5000)
  })

  it('sums price × quantity across multiple items', () => {
    useCartStore.getState().addItem(makeItem({ variantId: 'v1', price: 1000, quantity: 3 }))
    useCartStore.getState().addItem(makeItem({ variantId: 'v2', price: 2000, quantity: 1 }))
    // 3000 + 2000 = 5000
    expect(useCartStore.getState().totalPrice()).toBe(5000)
  })

  it('returns 0 after clearing the cart', () => {
    useCartStore.getState().addItem(makeItem({ price: 9999, quantity: 10 }))
    useCartStore.getState().clearCart()
    expect(useCartStore.getState().totalPrice()).toBe(0)
  })
})
