'use client'

import { ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/store/cart.store'
import { Button } from '@/components/ui/button'

export function CartIcon() {
  const items = useCartStore((s) => s.items)
  const openCart = useCartStore((s) => s.openCart)
  const count = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={openCart}
      aria-label={`Carrito — ${count} ${count === 1 ? 'producto' : 'productos'}`}
    >
      <ShoppingCart className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Button>
  )
}
