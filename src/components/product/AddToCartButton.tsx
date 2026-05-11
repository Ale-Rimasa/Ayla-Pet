'use client'

import { ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/store/cart.store'
import { Button } from '@/components/ui/button'
import type { CartItem } from '@/types'

interface AddToCartButtonProps {
  item: Omit<CartItem, 'quantity'>
  quantity?: number
  stock: number
  className?: string
}

export function AddToCartButton({
  item,
  quantity = 1,
  stock,
  className,
}: AddToCartButtonProps) {
  const addItem = useCartStore((s) => s.addItem)
  const openCart = useCartStore((s) => s.openCart)
  const cartQty = useCartStore((s) => {
    const existing = s.items.find((i) => i.variantId === item.variantId)
    return existing?.quantity ?? 0
  })

  const outOfStock = stock === 0
  const wouldExceedStock = cartQty + quantity > stock
  const disabled = outOfStock || wouldExceedStock

  const handleClick = () => {
    if (disabled) return
    addItem({ ...item, quantity })
    openCart()
  }

  return (
    <Button
      onClick={handleClick}
      disabled={disabled}
      className={className}
      size="lg"
    >
      <ShoppingCart className="mr-2 h-4 w-4" aria-hidden="true" />
      {outOfStock ? 'Sin stock' : 'Agregar al carrito'}
    </Button>
  )
}
