import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { OrderStatusSelector } from '@/components/admin/OrderStatusSelector'
import { formatPrice } from '@/lib/utils'
import type { Order } from '@/types'

interface OrdersTableProps {
  orders: Order[]
}

export function OrdersTable({ orders }: OrdersTableProps) {
  if (orders.length === 0) {
    return (
      <div className="rounded-md border py-12 text-center text-muted-foreground text-sm">
        Sin pedidos
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nro. pedido</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Pago</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Cambiar estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell>
                <span className="font-mono text-xs text-muted-foreground">
                  #{order.id.slice(0, 8).toUpperCase()}
                </span>
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium text-sm">{order.customer.name}</div>
                  <div className="text-xs text-muted-foreground">{order.customer.email}</div>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                {format(new Date(order.createdAt), "d MMM yyyy", { locale: es })}
              </TableCell>
              <TableCell className="font-medium text-sm">
                {formatPrice(order.total)}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {order.mpPaymentId ? (
                  <span className="font-mono">{order.mpPaymentId.slice(0, 8)}…</span>
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell>
                <StatusBadge status={order.status} />
              </TableCell>
              <TableCell>
                <OrderStatusSelector
                  orderId={order.id}
                  currentStatus={order.status}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
