'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/store/cart.store'
import { CartTable } from '@/components/cart/CartTable'
import { CartSummary } from '@/components/cart/CartSummary'
import { TrustBar } from '@/components/shared/TrustBar'
import { buttonVariants } from '@/components/ui/button'
import { getVariantsStockAction } from '@/lib/actions/cart'

export function CartClientShell() {
  const items = useCartStore((s) => s.items)
  const [maxQuantityMap, setMaxQuantityMap] = useState<Record<string, number>>({})

  useEffect(() => {
    if (items.length === 0) {
      setMaxQuantityMap({})
      return
    }

    let ignore = false
    const variantIds = items.map((i) => i.variantId)

    getVariantsStockAction(variantIds)
      .then((stockMap) => { if (!ignore) setMaxQuantityMap(stockMap) })
      .catch(() => { /* stock limits unavailable — QuantitySelector renders without max */ })

    return () => { ignore = true }
  }, [items])

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-8 font-heading text-3xl font-bold">Tu carrito</h1>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-6 py-24 text-center">
          <ShoppingCart className="h-16 w-16 text-muted-foreground/40" aria-hidden="true" />
          <div>
            <p className="text-lg font-medium">Tu carrito está vacío</p>
            <p className="mt-1 text-muted-foreground">
              Explorá nuestros productos y agregá algo que te guste.
            </p>
          </div>
          <Link href="/productos" className={buttonVariants({ size: 'lg' })}>
            Ver productos
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Table + coupon */}
          <div className="space-y-6 lg:col-span-2">
            <CartTable maxQuantityMap={maxQuantityMap} />
          </div>

          {/* Summary */}
          <div>
            <CartSummary />
          </div>
        </div>
      )}

      <div className="mt-16">
        <TrustBar />
      </div>
    </div>
  )
}
