import { Crown, Repeat, UserPlus, Users } from 'lucide-react'
import { z } from 'zod'
import { CustomersTable } from '@/components/admin/CustomersTable'
import { KPICard } from '@/components/admin/KPICard'
import { getCustomersForAdmin, getCustomersKpis } from '@/lib/db/customers'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 25

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string }>
}

export default async function AdminClientesPage({ searchParams }: PageProps) {
  const { page, search } = await searchParams
  const currentPage = z.coerce.number().int().min(1).catch(1).parse(page)
  const searchQuery = search?.trim() || undefined

  const [{ rows, total }, kpis] = await Promise.all([
    getCustomersForAdmin({
      search: searchQuery,
      page: currentPage,
      pageSize: PAGE_SIZE,
    }),
    getCustomersKpis(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Clientes</h1>
        <p className="text-muted-foreground text-sm">
          Gestioná la información y fidelidad de tus clientes
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total clientes"
          value={String(kpis.totalCustomers)}
          icon={<Users className="h-4 w-4" />}
        />
        <KPICard
          title="Nuevos este mes"
          value={String(kpis.newThisMonth)}
          icon={<UserPlus className="h-4 w-4" />}
        />
        <KPICard
          title="Clientes recurrentes"
          value={String(kpis.recurring)}
          icon={<Repeat className="h-4 w-4" />}
        />
        <KPICard
          title="VIP"
          value={String(kpis.vipCount ?? 0)}
          icon={<Crown className="h-4 w-4" />}
        />
      </div>

      <CustomersTable
        rows={rows}
        total={total}
        page={currentPage}
        pageSize={PAGE_SIZE}
        search={searchQuery}
      />
    </div>
  )
}