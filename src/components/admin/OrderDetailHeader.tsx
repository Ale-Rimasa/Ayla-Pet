import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ExternalLink } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { OrderStatusSelector } from '@/components/admin/OrderStatusSelector'
import { formatPrice } from '@/lib/utils'
import type { Order } from '@/types'

interface OrderDetailHeaderProps {
  order: Order
}

export function OrderDetailHeader({ order }: OrderDetailHeaderProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-mono text-xs text-muted-foreground">
            #{order.id.slice(0, 8).toUpperCase()}
          </p>
          <h1 className="text-2xl font-bold">Pedido</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(order.createdAt), "d MMM yyyy 'a las' HH:mm", {
              locale: es,
            })}
          </p>
        </div>

        <div className="flex flex-col gap-3 md:items-end">
          <p className="text-2xl font-semibold">{formatPrice(order.total)}</p>
          <div className="flex flex-wrap items-center gap-2">
            <OrderStatusSelector orderId={order.id} currentStatus={order.status} />
            {order.mpPaymentId ? (
              <a
                href={`https://www.mercadopago.com.ar/activities?search=${order.mpPaymentId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Ver pago MP
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
