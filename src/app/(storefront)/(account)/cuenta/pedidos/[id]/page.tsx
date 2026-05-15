import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCircle2, Circle } from 'lucide-react'
import { requireCustomer } from '@/lib/auth'
import { getOrderForCustomer } from '@/lib/db/orders'
import { formatPrice } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { OrderStatus } from '@/types'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Detalle del pedido',
  robots: { index: false },
}

interface PedidoDetailPageProps {
  params: Promise<{ id: string }>
}

const ORDER_STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'pending', label: 'Pendiente' },
  { status: 'paid', label: 'Pagado' },
  { status: 'processing', label: 'En preparación' },
  { status: 'shipped', label: 'Enviado' },
  { status: 'delivered', label: 'Entregado' },
]

export default async function PedidoDetailPage({ params }: PedidoDetailPageProps) {
  const user = await requireCustomer('/cuenta/pedidos')
  const { id } = await params
  const order = await getOrderForCustomer(id, { id: user.id, email: user.email ?? '' })

  if (!order) notFound()

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <Link href="/cuenta/pedidos" className="mb-6 inline-flex text-sm font-semibold text-[#B68A57] hover:underline">
        ← Volver a pedidos
      </Link>

      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B68A57]">Pedido</p>
          <h1 className="mt-2 font-heading text-3xl font-bold text-[#111111]">#{order.id.slice(0, 8)}</h1>
          <p className="mt-1 text-sm text-[#6B6258]">{new Date(order.createdAt).toLocaleString('es-AR')} · {order.status}</p>
        </div>
        <p className="text-2xl font-bold text-[#111111]">{formatPrice(order.total)}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card className="border-[#E7DCCF] bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-xl text-[#111111]">Productos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between gap-4">
                  <div>
                    <p className="font-medium text-[#111111]">{item.productName}</p>
                    <p className="text-sm text-[#6B6258]">{item.variantName} · Cantidad {item.quantity}</p>
                  </div>
                  <p className="font-semibold text-[#111111]">{formatPrice(item.subtotal)}</p>
                </div>
              ))}
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-[#6B6258]">Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-[#6B6258]">Envío</span><span>{order.shippingCost === 0 ? 'Gratis' : formatPrice(order.shippingCost)}</span></div>
                <div className="flex justify-between text-base font-semibold text-[#111111]"><span>Total</span><span>{formatPrice(order.total)}</span></div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#E7DCCF] bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-xl text-[#111111]">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ORDER_STEPS.map((step) => {
                const currentIndex = ORDER_STEPS.findIndex((item) => item.status === order.status)
                const stepIndex = ORDER_STEPS.findIndex((item) => item.status === step.status)
                const isDone = currentIndex >= stepIndex && currentIndex !== -1
                const Icon = isDone ? CheckCircle2 : Circle

                return (
                  <div key={step.status} className="flex items-center gap-3">
                    <Icon className={isDone ? 'h-5 w-5 text-[#B68A57]' : 'h-5 w-5 text-[#E7DCCF]'} aria-hidden="true" />
                    <span className={isDone ? 'font-medium text-[#111111]' : 'text-[#6B6258]'}>{step.label}</span>
                  </div>
                )
              })}
              {(order.status === 'cancelled' || order.status === 'refunded') && (
                <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">Estado actual: {order.status}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit border-[#E7DCCF] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-xl text-[#111111]">Envío</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="font-medium text-[#111111]">{order.customer.name}</p>
              <p className="text-[#6B6258]">{order.customer.email}</p>
              <p className="text-[#6B6258]">{order.customer.phone}</p>
            </div>
            <Separator />
            <div className="text-[#6B6258]">
              <p>{order.shippingAddress.street}</p>
              <p>{order.shippingAddress.city}, {order.shippingAddress.province}</p>
              <p>CP {order.shippingAddress.postalCode}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
