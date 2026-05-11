'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react'
import { useCartStore } from '@/store/cart.store'
import { useCheckoutStore } from '@/store/checkout.store'
import { getOrderStatus } from '@/lib/actions/orders'
import { formatPrice } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { Order } from '@/types'

const MAX_ATTEMPTS = 10
const POLL_INTERVAL_MS = 3000

type PollingState = 'loading' | 'polling' | 'paid' | 'timeout'

interface ConfirmacionClientProps {
  order: Order
}

export function ConfirmacionClient({ order }: ConfirmacionClientProps) {
  const clearCart = useCartStore((s) => s.clearCart)
  const resetCheckout = useCheckoutStore((s) => s.resetCheckout)

  const initialState: PollingState = order.status === 'paid' ? 'paid' : 'polling'
  const [pollingState, setPollingState] = useState<PollingState>(initialState)
  const attemptsRef = useRef(0)
  const consecutiveErrorsRef = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Clear cart + store only when payment is confirmed — not on every mount.
  // Avoids wiping the cart if the user navigates here unexpectedly (e.g. browser back).
  useEffect(() => {
    if (pollingState === 'paid') {
      clearCart()
      resetCheckout()
    }
  }, [pollingState, clearCart, resetCheckout])

  useEffect(() => {
    // If already paid on mount, no polling needed
    if (order.status === 'paid') return

    let stopped = false

    function stopPolling() {
      stopped = true
      if (intervalRef.current !== null) {
        clearTimeout(intervalRef.current)
        intervalRef.current = null
      }
    }

    const MAX_CONSECUTIVE_ERRORS = 4

    async function tick() {
      if (stopped) return
      attemptsRef.current += 1

      try {
        const result = await getOrderStatus(order.id)
        consecutiveErrorsRef.current = 0

        if (result?.status === 'paid') {
          stopPolling()
          setPollingState('paid')
          return
        }
      } catch {
        consecutiveErrorsRef.current += 1
        // Too many consecutive errors → treat as timeout, stop polling
        if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS) {
          stopPolling()
          setPollingState('timeout')
          return
        }
      }

      if (attemptsRef.current >= MAX_ATTEMPTS) {
        stopPolling()
        setPollingState('timeout')
        return
      }

      // Schedule next tick only after this one completes — no overlap
      if (!stopped) {
        intervalRef.current = setTimeout(tick, POLL_INTERVAL_MS)
      }
    }

    intervalRef.current = setTimeout(tick, POLL_INTERVAL_MS)

    return () => {
      stopPolling()
    }
  }, [order.id, order.status])

  // ─── Paid state ──────────────────────────────────────────────────────────

  if (pollingState === 'paid') {
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

  // ─── Timeout state ───────────────────────────────────────────────────────

  if (pollingState === 'timeout') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <AlertCircle className="mx-auto h-16 w-16 text-amber-500" aria-hidden="true" />
          <h1 className="mt-4 font-heading text-2xl font-bold">
            Aún no confirmamos tu pago
          </h1>
          <p className="mt-2 text-muted-foreground">
            Te avisaremos por email cuando se acredite.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Número de pedido:{' '}
            <span className="font-mono font-semibold text-foreground">
              #{order.id.slice(0, 8).toUpperCase()}
            </span>
          </p>
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

  // ─── Polling / loading state ─────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <Loader2
          className="mx-auto h-16 w-16 animate-spin text-secondary"
          aria-hidden="true"
        />
        <h1 className="mt-4 font-heading text-2xl font-bold">Verificando tu pago…</h1>
        <p className="mt-2 text-muted-foreground">
          Estamos confirmando tu pago con MercadoPago. Esto puede tardar unos segundos.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Número de pedido:{' '}
          <span className="font-mono font-semibold text-foreground">
            #{order.id.slice(0, 8).toUpperCase()}
          </span>
        </p>
      </div>
    </div>
  )
}
