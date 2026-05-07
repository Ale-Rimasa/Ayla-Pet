import Link from 'next/link'
import { Package, ShoppingCart, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react'
import { getStats } from '@/lib/db/stats'
import { KPICard } from '@/components/admin/KPICard'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { LineChart } from '@/components/admin/charts/LineChart'
import { PieChart } from '@/components/admin/charts/PieChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
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

export default async function AdminDashboardPage() {
  const stats = await getStats()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Resumen general de tu tienda</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard
          title="Ventas totales"
          value={formatPrice(stats.totalRevenue)}
          delta={stats.revenueDelta}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KPICard
          title="Pedidos"
          value={String(stats.totalOrders)}
          delta={stats.ordersDelta}
          icon={<ShoppingCart className="h-4 w-4" />}
        />
        <KPICard
          title="Productos activos"
          value={String(stats.activeProducts)}
          icon={<Package className="h-4 w-4" />}
        />
        <KPICard
          title="Pedidos este mes"
          value={String(stats.ordersThisMonth)}
          delta={stats.ordersDelta}
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ventas por mes</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart data={stats.salesByMonth} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Valor catálogo por categoría</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.salesByCategory.length > 0 ? (
              <PieChart data={stats.salesByCategory} />
            ) : (
              <div className="flex h-[250px] items-center justify-center text-muted-foreground text-sm">
                Sin datos de categorías aún
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low stock + Recent orders */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Low stock */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <CardTitle className="text-base">Stock bajo (≤ 5)</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.lowStockProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin productos en stock bajo</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.lowStockProducts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-orange-600">
                          {p.variants[0]?.stock ?? 0}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Pedidos recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin pedidos aún</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{order.customer.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(order.createdAt), 'd MMM', { locale: es })}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatPrice(order.total)}</TableCell>
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

      {/* Quick links */}
      <div className="flex gap-3">
        <Link href="/admin/productos" className={buttonVariants()}>
          Gestionar productos
        </Link>
        <Link href="/admin/pedidos" className={buttonVariants({ variant: 'outline' })}>
          Ver pedidos
        </Link>
      </div>
    </div>
  )
}
