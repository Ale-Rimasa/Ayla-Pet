'use client'

import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateOrderStatus } from '@/lib/actions/orders'
import type { OrderStatus } from '@/types'

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['processing', 'cancelled', 'refunded'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: ['refunded'],
  refunded: [],
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  processing: 'En proceso',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
}

interface OrderStatusSelectorProps {
  orderId: string
  currentStatus: OrderStatus
}

export function OrderStatusSelector({ orderId, currentStatus }: OrderStatusSelectorProps) {
  const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? []

  if (allowed.length === 0) {
    return (
      <span className="text-sm text-muted-foreground">
        {STATUS_LABELS[currentStatus]}
      </span>
    )
  }

  async function handleChange(newStatus: string | null) {
    if (!newStatus) return
    const result = await updateOrderStatus({
      orderId,
      status: newStatus as OrderStatus,
    })

    if (result.ok) {
      toast.success(`Estado actualizado a "${STATUS_LABELS[newStatus as OrderStatus]}"`)
    } else {
      toast.error(result.error ?? 'Error al actualizar estado')
    }
  }

  return (
    <Select value={currentStatus} onValueChange={handleChange}>
      <SelectTrigger className="h-8 w-40 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={currentStatus} disabled>
          {STATUS_LABELS[currentStatus]} (actual)
        </SelectItem>
        {allowed.map((status) => (
          <SelectItem key={status} value={status}>
            → {STATUS_LABELS[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
