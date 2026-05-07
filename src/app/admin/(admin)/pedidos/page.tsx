import Link from 'next/link'
import { z } from 'zod'
import { getOrdersForAdmin } from '@/lib/db/orders'
import { OrdersTable } from '@/components/admin/OrdersTable'
import type { OrderStatus } from '@/types'

const orderStatusSchema = z.enum([
  'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded',
])

const TABS: { label: string; value: string }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Pendiente', value: 'pending' },
  { label: 'Pagado', value: 'paid' },
  { label: 'En proceso', value: 'processing' },
  { label: 'Enviado', value: 'shipped' },
  { label: 'Entregado', value: 'delivered' },
  { label: 'Cancelado', value: 'cancelled' },
]

interface PageProps {
  searchParams: Promise<{ status?: string; page?: string }>
}

export default async function AdminPedidosPage({ searchParams }: PageProps) {
  const { status, page } = await searchParams
  const currentPage = Number(page ?? '1') || 1

  const statusParsed = status && status !== 'all' ? orderStatusSchema.safeParse(status) : null
  const validatedStatus: OrderStatus | undefined = statusParsed?.success ? statusParsed.data : undefined

  const { data: orders, count } = await getOrdersForAdmin({
    status: validatedStatus,
    page: currentPage,
    pageSize: 20,
  })

  const totalPages = Math.ceil(count / 20)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <p className="text-muted-foreground text-sm">{count} pedido{count !== 1 ? 's' : ''}</p>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const isActive =
            tab.value === 'all' ? !status || status === 'all' : status === tab.value
          return (
            <Link
              key={tab.value}
              href={`/admin/pedidos${tab.value !== 'all' ? `?status=${tab.value}` : ''}`}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      <OrdersTable orders={orders} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Link
            href={`/admin/pedidos?${status ? `status=${status}&` : ''}page=${currentPage - 1}`}
            aria-disabled={currentPage <= 1}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              currentPage <= 1 ? 'pointer-events-none opacity-50' : 'hover:bg-muted'
            }`}
          >
            Anterior
          </Link>
          <span className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </span>
          <Link
            href={`/admin/pedidos?${status ? `status=${status}&` : ''}page=${currentPage + 1}`}
            aria-disabled={currentPage >= totalPages}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'hover:bg-muted'
            }`}
          >
            Siguiente
          </Link>
        </div>
      )}
    </div>
  )
}
