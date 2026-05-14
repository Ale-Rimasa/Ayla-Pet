'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { OrderStatusSelector } from '@/components/admin/OrderStatusSelector'
import { useDebounce } from '@/hooks/useDebounce'
import { formatPrice } from '@/lib/utils'
import type { Order } from '@/types'

interface OrdersTableProps {
  orders: Order[]
  searchQuery?: string
}

export function OrdersTable({ orders, searchQuery = '' }: OrdersTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchQuery)
  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    setQuery(searchQuery)
  }, [searchQuery])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const trimmed = debouncedQuery.trim()

    if (trimmed) {
      params.set('search', trimmed)
    } else {
      params.delete('search')
    }

    params.delete('page')
    const qs = params.toString()
    router.replace(qs ? `/admin/pedidos?${qs}` : '/admin/pedidos')
  }, [debouncedQuery, router, searchParams])

  return (
    <div className="space-y-3">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por cliente o email..."
        className="max-w-sm"
      />

      {orders.length === 0 ? (
        <div className="rounded-md border py-12 text-center text-muted-foreground text-sm">
          Sin pedidos
        </div>
      ) : (
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
                <TableRow
                  key={order.id}
                  onClick={() => router.push(`/admin/pedidos/${order.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      router.push(`/admin/pedidos/${order.id}`)
                    }
                  }}
                  tabIndex={0}
                  role="link"
                  className="cursor-pointer"
                >
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
                    {format(new Date(order.createdAt), 'd MMM yyyy', { locale: es })}
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
                  <TableCell
                    onClick={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                  >
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
      )}
    </div>
  )
}
