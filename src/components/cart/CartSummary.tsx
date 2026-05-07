'use client'

import Link from 'next/link'
import { useCartStore } from '@/store/cart.store'
import { formatPrice } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export function CartSummary() {
  const totalPrice = useCartStore((s) => s.totalPrice)
  const items = useCartStore((s) => s.items)

  const subtotal = totalPrice()
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="mb-4 text-lg font-semibold">Resumen del pedido</h2>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            Subtotal ({itemCount} {itemCount === 1 ? 'producto' : 'productos'})
          </span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Descuento</span>
          <span className="text-muted-foreground">—</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Envío</span>
          <span className="text-muted-foreground">Se calcula al finalizar</span>
        </div>
      </div>

      <Separator className="my-4" />

      <div className="flex justify-between font-semibold">
        <span>Total estimado</span>
        <span className="text-lg">{formatPrice(subtotal)}</span>
      </div>

      <Link
        href={items.length > 0 ? '/checkout' : '#'}
        aria-disabled={items.length === 0}
        className={buttonVariants({ size: 'lg' }) + ' mt-6 w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground' + (items.length === 0 ? ' pointer-events-none opacity-50' : '')}
      >
        Proceder al checkout
      </Link>

      <Link href="/productos" className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' mt-2 w-full'}>
        Seguir comprando
      </Link>
    </div>
  )
}
