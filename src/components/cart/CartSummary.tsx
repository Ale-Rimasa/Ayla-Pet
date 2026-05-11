'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/store/cart.store'
import { formatPrice } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { validateCartBeforeCheckout } from '@/lib/actions/cart'
import type { ItemStockError } from '@/lib/db/stock'
import Link from 'next/link'

export function CartSummary() {
  const router = useRouter()
  const totalPrice = useCartStore((s) => s.totalPrice)
  const items = useCartStore((s) => s.items)
  const [isPending, startTransition] = useTransition()
  const [stockErrors, setStockErrors] = useState<ItemStockError[]>([])

  const subtotal = totalPrice()
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)

  const handleCheckout = () => {
    setStockErrors([])
    startTransition(async () => {
      const cartItems = items.map((i) => ({
        variantId: i.variantId,
        quantity: i.quantity,
      }))

      const result = await validateCartBeforeCheckout(cartItems)

      if (!result.ok) {
        setStockErrors(result.errors)
        return
      }

      router.push('/checkout')
    })
  }

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

      {stockErrors.length > 0 && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm"
        >
          <p className="mb-2 font-medium text-destructive">
            Algunos productos ya no tienen el stock suficiente:
          </p>
          <ul className="space-y-1">
            {stockErrors.map((err) => (
              <li key={err.variantId} className="text-destructive/80">
                <span className="font-medium">{err.productName}</span>: pediste{' '}
                {err.requested}, disponible{' '}
                {err.available === 0 ? 'sin stock' : err.available}
              </li>
            ))}
          </ul>
        </div>
      )}

      {items.length > 0 ? (
        <Button
          onClick={handleCheckout}
          disabled={isPending}
          size="lg"
          className="mt-6 w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground"
        >
          {isPending ? 'Verificando stock...' : 'Proceder al checkout'}
        </Button>
      ) : (
        <Button
          disabled
          size="lg"
          className="mt-6 w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground"
        >
          Proceder al checkout
        </Button>
      )}

      <Link
        href="/productos"
        className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' mt-2 w-full'}
      >
        Seguir comprando
      </Link>
    </div>
  )
}
