'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { useCartStore } from '@/store/cart.store'
import { useCheckoutStore } from '@/store/checkout.store'
import { formatPrice } from '@/lib/utils'
import { TRANSFER } from '@/lib/constants'
import { buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { Order } from '@/types'

interface ConfirmacionClientProps {
  order: Order
}

export function ConfirmacionClient({ order }: ConfirmacionClientProps) {
  const clearCart = useCartStore((s) => s.clearCart)
  const resetCheckout = useCheckoutStore((s) => s.resetCheckout)

  // Limpiamos carrito y store una sola vez al confirmar el pedido.
  // clearCart y resetCheckout son funciones estables en Zustand — safe ignorar deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { clearCart(); resetCheckout() }, [])

  function copyToClipboard(value: string, label: string) {
    navigator.clipboard.writeText(value).then(() => {
      toast.success(`${label} copiado`)
    })
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center">
        <CheckCircle className="mx-auto h-16 w-16 text-secondary" aria-hidden="true" />
        <h1 className="mt-4 font-heading text-3xl font-bold">¡Pedido recibido!</h1>
        <p className="mt-2 text-muted-foreground">
          Completá la transferencia y luego subí las fotos de tu mascota.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Número de pedido:{' '}
          <span className="font-mono font-semibold text-foreground">
            #{order.id.slice(0, 8).toUpperCase()}
          </span>
        </p>
      </div>

      {/* Datos bancarios */}
      <div className="mt-10 rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 font-semibold">Datos para la transferencia</h2>

        <div className="space-y-3 text-sm">
          <TransferRow label="CBU" value={TRANSFER.cbu} onCopy={copyToClipboard} />
          <TransferRow label="Alias" value={TRANSFER.alias} onCopy={copyToClipboard} />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Titular</span>
            <span className="font-medium">{TRANSFER.titular}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Banco</span>
            <span className="font-medium">{TRANSFER.banco}</span>
          </div>

          <Separator className="my-3" />

          <div className="flex justify-between text-base font-semibold">
            <span>Total a transferir</span>
            <span className="text-secondary">{formatPrice(order.total)}</span>
          </div>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Usá el número de pedido{' '}
          <span className="font-mono font-medium text-foreground">
            #{order.id.slice(0, 8).toUpperCase()}
          </span>{' '}
          como referencia de la transferencia.
        </p>
      </div>

      {/* Resumen del pedido */}
      <div className="mt-6 rounded-xl border border-border bg-card p-6">
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

      {/* CTAs */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href={`/mi-pedido/${order.id}/fotos`}
          className={buttonVariants({ size: 'lg' })}
        >
          Subir mis fotos
        </Link>
        <Link href="/productos" className={buttonVariants({ size: 'lg', variant: 'outline' })}>
          Seguir comprando
        </Link>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Podés subir las fotos ahora mismo. Confirmamos tu pago en cuanto acreditemos la transferencia.
      </p>
    </div>
  )
}

function TransferRow({
  label,
  value,
  onCopy,
}: {
  label: string
  value: string
  onCopy: (value: string, label: string) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono font-medium">{value}</span>
        <button
          onClick={() => onCopy(value, label)}
          aria-label={`Copiar ${label}`}
          className="rounded p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
