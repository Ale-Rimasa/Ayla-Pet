import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getOrderById } from '@/lib/db/orders'
import { ConfirmacionClient } from './ConfirmacionClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Pedido confirmado',
  robots: { index: false },
}

interface Props {
  searchParams: Promise<{
    // Transfer manual
    orderId?: string
    // MercadoPago back_url params
    external_reference?: string
    status?: string
    payment_id?: string
  }>
}

export default async function ConfirmacionPage({ searchParams }: Props) {
  const params = await searchParams

  // Transfer uses ?orderId=, MP uses ?external_reference=
  const orderId = params.orderId ?? params.external_reference
  if (!orderId) redirect('/')

  const order = await getOrderById(orderId)
  if (!order) redirect('/')

  // null = transfer manual; 'approved' | 'pending' | 'in_process' = MP
  const mpStatus = params.status ?? null

  return <ConfirmacionClient order={order} mpStatus={mpStatus} />
}
