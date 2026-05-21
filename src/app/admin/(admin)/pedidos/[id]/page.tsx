import { notFound } from 'next/navigation'
import { getOrderByIdForAdmin, getOrderStatusHistory } from '@/lib/db/orders'
import { OrderCustomerCard } from '@/components/admin/OrderCustomerCard'
import { OrderDetailHeader } from '@/components/admin/OrderDetailHeader'
import { OrderItemsTable } from '@/components/admin/OrderItemsTable'
import { OrderReferencePhotosCard } from '@/components/admin/OrderReferencePhotosCard'
import { OrderStatusTimeline } from '@/components/admin/OrderStatusTimeline'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminPedidoDetallePage({ params }: PageProps) {
  const { id } = await params
  const [order, history] = await Promise.all([
    getOrderByIdForAdmin(id),
    getOrderStatusHistory(id),
  ])

  if (!order) {
    notFound()
  }

  return (
    <div className="space-y-4">
      <OrderDetailHeader order={order} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <OrderItemsTable items={order.items} />
          <OrderStatusTimeline history={history} />
        </div>
        <div className="space-y-4">
          <OrderCustomerCard order={order} />
          <OrderReferencePhotosCard orderId={order.id} />
        </div>
      </div>
    </div>
  )
}
