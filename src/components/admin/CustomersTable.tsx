'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useDebounce } from '@/hooks/useDebounce'
import { formatPrice } from '@/lib/utils'
import type { CustomerRow } from '@/lib/db/customers'

interface CustomersTableProps {
  rows: CustomerRow[]
  total: number
  page: number
  pageSize: number
  search?: string
}

function buildClientesHref(params: { page?: number; search?: string }) {
  const qs = new URLSearchParams()
  if (params.search) qs.set('search', params.search)
  if (params.page && params.page > 1) qs.set('page', String(params.page))
  const queryString = qs.toString()
  return queryString ? `/admin/clientes?${queryString}` : '/admin/clientes'
}

export function CustomersTable({
  rows,
  total,
  page,
  pageSize,
  search = '',
}: CustomersTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(search)
  const debouncedQuery = useDebounce(query, 300)
  const totalPages = Math.ceil(total / pageSize)

  useEffect(() => {
    setQuery(search)
  }, [search])

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
    router.replace(qs ? `/admin/clientes?${qs}` : '/admin/clientes')
  }, [debouncedQuery, router, searchParams])

  return (
    <div className="space-y-3">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por nombre o email..."
        className="max-w-sm"
      />

      {rows.length === 0 ? (
        <div className="rounded-md border py-12 text-center text-muted-foreground text-sm">
          Sin clientes
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Pedidos</TableHead>
                <TableHead>Total gastado</TableHead>
                <TableHead>Último pedido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((customer) => (
                <TableRow key={customer.email}>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{customer.name}</span>
                        {customer.isVip && (
                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                            VIP
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{customer.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {customer.orderCount}
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {formatPrice(customer.totalRevenue)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {format(new Date(customer.lastOrderAt), 'd MMM yyyy', { locale: es })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          {page <= 1 ? (
            <span className="rounded-md border px-3 py-1.5 text-sm opacity-50" aria-disabled="true">
              Anterior
            </span>
          ) : (
            <Link href={buildClientesHref({ search, page: page - 1 })} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
              Anterior
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          {page >= totalPages ? (
            <span className="rounded-md border px-3 py-1.5 text-sm opacity-50" aria-disabled="true">
              Siguiente
            </span>
          ) : (
            <Link href={buildClientesHref({ search, page: page + 1 })} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
              Siguiente
            </Link>
          )}
        </div>
      )}
    </div>
  )
}