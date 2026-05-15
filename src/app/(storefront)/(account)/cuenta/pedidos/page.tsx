import type { Metadata } from 'next'
import Link from 'next/link'
import { Package } from 'lucide-react'
import { requireCustomer } from '@/lib/auth'
import { getOrdersForCustomer } from '@/lib/db/orders'
import { formatPrice } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Mis pedidos',
  robots: { index: false },
}

interface PedidosPageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function PedidosPage({ searchParams }: PedidosPageProps) {
  const user = await requireCustomer('/cuenta/pedidos')
  const { page: pageParam } = await searchParams
  const page = Math.max(Number.parseInt(pageParam ?? '1', 10) || 1, 1)
  const pageSize = 10
  const { data: orders, count } = await getOrdersForCustomer(user.id, { page, pageSize })
  const hasPrevious = page > 1
  const hasNext = page * pageSize < count

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B68A57]">Mi cuenta</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-[#111111]">Mis pedidos</h1>
      </div>

      {orders.length === 0 ? (
        <Card className="border-[#E7DCCF] bg-white text-center shadow-sm">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Package className="h-10 w-10 text-[#B68A57]" aria-hidden="true" />
            <div>
              <p className="font-medium text-[#111111]">Todavía no hay pedidos.</p>
              <p className="mt-1 text-sm text-[#6B6258]">Elegí una pieza personalizada y la vas a ver acá.</p>
            </div>
            <Link href="/productos" className="inline-flex h-9 items-center justify-center rounded-lg bg-[#111111] px-4 text-sm font-medium text-white hover:bg-[#111111]/90">
              Ir a la tienda
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="border-[#E7DCCF] bg-white shadow-sm">
              <CardHeader className="flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="font-heading text-lg text-[#111111]">Pedido #{order.id.slice(0, 8)}</CardTitle>
                  <p className="mt-1 text-sm text-[#6B6258]">{new Date(order.createdAt).toLocaleDateString('es-AR')} · {order.status}</p>
                </div>
                <p className="font-semibold text-[#111111]">{formatPrice(order.total)}</p>
              </CardHeader>
              <CardContent>
                <Link href={`/cuenta/pedidos/${order.id}`} className="inline-flex h-8 items-center justify-center rounded-lg border border-[#E7DCCF] px-3 text-sm font-medium hover:bg-[#FAF7F2]">
                  Ver detalle
                </Link>
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-center gap-2 pt-4">
            {hasPrevious && <Link className="inline-flex h-8 items-center justify-center rounded-lg border border-[#E7DCCF] px-3 text-sm font-medium hover:bg-[#FAF7F2]" href={`/cuenta/pedidos?page=${page - 1}`}>? Anterior</Link>}
            {hasNext && <Link className="inline-flex h-8 items-center justify-center rounded-lg border border-[#E7DCCF] px-3 text-sm font-medium hover:bg-[#FAF7F2]" href={`/cuenta/pedidos?page=${page + 1}`}>Siguiente ?</Link>}
          </div>
        </div>
      )}
    </main>
  )
}
