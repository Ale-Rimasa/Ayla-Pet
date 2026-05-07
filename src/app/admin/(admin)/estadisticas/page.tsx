import { DollarSign, ShoppingCart, Package } from 'lucide-react'
import { getStats } from '@/lib/db/stats'
import { KPICard } from '@/components/admin/KPICard'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { LineChart } from '@/components/admin/charts/LineChart'
import { PieChart } from '@/components/admin/charts/PieChart'
import { DonutChart } from '@/components/admin/charts/DonutChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatPrice } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default async function AdminEstadisticasPage() {
  const stats = await getStats()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Estadísticas</h1>
        <p className="text-muted-foreground text-sm">Vista general del rendimiento de tu tienda</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KPICard
          title="Total facturado"
          value={formatPrice(stats.totalRevenue)}
          delta={stats.revenueDelta}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KPICard
          title="Total pedidos"
          value={String(stats.totalOrders)}
          delta={stats.ordersDelta}
          icon={<ShoppingCart className="h-4 w-4" />}
        />
        <KPICard
          title="Productos activos"
          value={String(stats.activeProducts)}
          icon={<Package className="h-4 w-4" />}
        />
      </div>

      {/* Multi-serie line chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ventas y pedidos por mes</CardTitle>
        </CardHeader>
        <CardContent>
          <LineChart data={stats.salesByMonth} showOrders />
        </CardContent>
      </Card>

      {/* Payment methods + Order status */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Métodos de pago</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.paymentMethodData.length > 0 ? (
              <PieChart data={stats.paymentMethodData} />
            ) : (
              <div className="flex h-[250px] items-center justify-center text-muted-foreground text-sm">
                Sin pagos registrados aún
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estado de pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.orderStatusData.length > 0 ? (
              <DonutChart data={stats.orderStatusData} />
            ) : (
              <div className="flex h-[250px] items-center justify-center text-muted-foreground text-sm">
                Sin pedidos aún
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent orders table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimos pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin pedidos</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="text-sm font-medium">
                      {order.customer.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(order.createdAt), 'd MMM', { locale: es })}
                    </TableCell>
                    <TableCell className="text-sm">{formatPrice(order.total)}</TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
