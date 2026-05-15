import type { Metadata } from 'next'
import Link from 'next/link'
import { Package } from 'lucide-react'
import { requireCustomer } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getOrdersForCustomer } from '@/lib/db/orders'
import { formatPrice } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Mi cuenta',
  robots: { index: false },
}

export default async function CuentaPage() {
  const user = await requireCustomer('/cuenta')
  const supabase = await createClient()

  const [{ data: profile }, { data: orders }] = await Promise.all([
    supabase.from('profiles').select('full_name, email').eq('id', user.id).maybeSingle(),
    getOrdersForCustomer(user.id, { page: 1, pageSize: 5 }),
  ])

  const displayName = profile?.full_name ?? user.email ?? profile?.email ?? 'tu cuenta'

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B68A57]">Mi cuenta</p>
          <h1 className="mt-2 font-heading text-3xl font-bold text-[#111111]">Hola, {displayName}</h1>
          <p className="mt-1 text-sm text-[#6B6258]">Acá tenés tus últimos pedidos y accesos rápidos.</p>
        </div>
        <Link href="/productos" className="inline-flex h-9 items-center justify-center rounded-lg bg-[#111111] px-4 text-sm font-medium text-white hover:bg-[#111111]/90">
          Ver productos
        </Link>
      </div>

      <Card className="border-[#E7DCCF] bg-white shadow-sm">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="font-heading text-xl text-[#111111]">Pedidos recientes</CardTitle>
          <Link href="/cuenta/pedidos" className="text-sm font-semibold text-[#B68A57] hover:underline">Ver todos</Link>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Package className="h-10 w-10 text-[#B68A57]" aria-hidden="true" />
              <p className="font-medium text-[#111111]">Todavía no tenés pedidos.</p>
              <p className="text-sm text-[#6B6258]">Cuando compres, vas a poder seguirlos desde acá.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id}>
                  <Link href={`/cuenta/pedidos/${order.id}`} className="flex items-center justify-between gap-4 rounded-lg p-2 transition-colors hover:bg-[#FAF7F2]">
                    <div>
                      <p className="font-medium text-[#111111]">Pedido #{order.id.slice(0, 8)}</p>
                      <p className="text-sm text-[#6B6258]">{new Date(order.createdAt).toLocaleDateString('es-AR')} · {order.status}</p>
                    </div>
                    <p className="font-semibold text-[#111111]">{formatPrice(order.total)}</p>
                  </Link>
                  <Separator className="mt-4 last:hidden" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
