'use client'

import Image from 'next/image'
import { X } from 'lucide-react'
import { useCartStore } from '@/store/cart.store'
import { formatPrice } from '@/lib/utils'
import { QuantitySelector } from '@/components/shared/QuantitySelector'
import { Button } from '@/components/ui/button'

export function CartTable() {
  const items = useCartStore((s) => s.items)
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)

  if (items.length === 0) return null

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/40">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Producto
            </th>
            <th className="hidden px-4 py-3 text-right font-medium text-muted-foreground sm:table-cell">
              Precio
            </th>
            <th className="px-4 py-3 text-center font-medium text-muted-foreground">
              Cantidad
            </th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">
              Total
            </th>
            <th className="w-10 px-2 py-3" aria-label="Acciones" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {items.map((item) => (
            <tr key={item.variantId}>
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                    {item.imageUrl && (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div>
                    <p className="font-medium leading-tight">{item.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground sm:hidden">
                      {formatPrice(item.price)}
                    </p>
                  </div>
                </div>
              </td>
              <td className="hidden px-4 py-4 text-right sm:table-cell">
                {formatPrice(item.price)}
              </td>
              <td className="px-4 py-4">
                <div className="flex justify-center">
                  <QuantitySelector
                    value={item.quantity}
                    min={1}
                    onChange={(qty) => updateQuantity(item.variantId, qty)}
                  />
                </div>
              </td>
              <td className="px-4 py-4 text-right font-semibold">
                {formatPrice(item.price * item.quantity)}
              </td>
              <td className="px-2 py-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeItem(item.variantId)}
                  aria-label={`Eliminar ${item.name}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
