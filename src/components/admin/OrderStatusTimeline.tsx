import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/admin/StatusBadge'
import type { OrderStatusHistoryEntry } from '@/lib/db/orders'

interface OrderStatusTimelineProps {
  history: OrderStatusHistoryEntry[]
}

export function OrderStatusTimeline({ history }: OrderStatusTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de estados</CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin historial de cambios</p>
        ) : (
          <div className="space-y-4">
            {history.map((entry) => (
              <div key={entry.id} className="relative border-l pl-4">
                <div className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-primary" />
                <div className="flex flex-wrap items-center gap-2">
                  {entry.fromStatus ? (
                    <StatusBadge status={entry.fromStatus} />
                  ) : (
                    <span className="text-xs text-muted-foreground">Inicio</span>
                  )}
                  <span className="text-xs text-muted-foreground">→</span>
                  <StatusBadge status={entry.toStatus} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {format(new Date(entry.createdAt), "d MMM yyyy 'a las' HH:mm", {
                    locale: es,
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
