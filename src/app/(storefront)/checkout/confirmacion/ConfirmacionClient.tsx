'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { useCartStore } from '@/store/cart.store'
import { formatPrice } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { Order } from '@/types'

interface ConfirmacionClientProps {
  order: Order
}

export function ConfirmacionClient({ order }: ConfirmacionClientProps) {
  const clearCart = useCartStore((s) => s.clearCart)

  useEffect(() => {
    clearCart()
  }, [clearCart])

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <CheckCircle className="mx-auto h-16 w-16 text-secondary" aria-hidden="true" />
        <h1 className="mt-4 font-heading text-3xl font-bold">¡Pedido confirmado!</h1>
        <p className="mt-2 text-muted-foreground">
          Gracias por tu compra. Te enviaremos un email con los detalles.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Número de pedido:{' '}
          <span className="font-mono font-semibold text-foreground">
            #{order.id.slice(0, 8).toUpperCase()}
          </span>
        </p>
      </div>

      {/* Order summary */}
      <div className="mt-10 rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 font-semibold">Resumen del pedido</h2>

        <ul className="space-y-3">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between text-sm">
              <span>
                {item.productName} — {item.variantName}{' '}
                <span className="text-muted-foreground">x{item.quantity}</span>
              </span>
              <span className="font-medium">{formatPrice(item.subtotal)}</span>
            </li>
          ))}
        </ul>

        <Separator className="my-4" />

        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Envío</span>
            <span>{formatPrice(order.shippingCost)}</span>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span className="text-lg">{formatPrice(order.total)}</span>
        </div>
      </div>

      {/* Shipping info */}
      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="mb-3 font-semibold">Datos de envío</h2>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>{order.customer.name}</p>
          <p>{order.customer.email}</p>
          <p>
            {order.shippingAddress.street}, {order.shippingAddress.city},{' '}
            {order.shippingAddress.province} ({order.shippingAddress.postalCode})
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/productos" className={buttonVariants({ size: 'lg' })}>
          Seguir comprando
        </Link>
        <Link href="/" className={buttonVariants({ size: 'lg', variant: 'outline' })}>
          Ir al inicio
        </Link>
      </div>
    </div>
  )
}
