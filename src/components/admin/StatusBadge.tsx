import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/types'

const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pendiente',
    className: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
  },
  paid: {
    label: 'Pagado',
    className: 'bg-green-100 text-green-700 hover:bg-green-100',
  },
  processing: {
    label: 'En proceso',
    className: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  },
  shipped: {
    label: 'Enviado',
    className: 'bg-violet-100 text-violet-700 hover:bg-violet-100',
  },
  delivered: {
    label: 'Entregado',
    className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  },
  cancelled: {
    label: 'Cancelado',
    className: 'bg-red-100 text-red-700 hover:bg-red-100',
  },
  refunded: {
    label: 'Reembolsado',
    className: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  },
}

interface StatusBadgeProps {
  status: OrderStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: 'bg-gray-100 text-gray-700',
  }

  return (
    <Badge
      variant="secondary"
      className={cn('border-0 font-medium', config.className)}
    >
      {config.label}
    </Badge>
  )
}
