import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getOrderById, updateOrderStatus } from '@/lib/db/orders'
import { getTransferInfo } from '@/lib/db/site-settings'
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

  const [order, transferInfo] = await Promise.all([
    getOrderById(orderId),
    getTransferInfo(),
  ])
  if (!order) redirect('/')

  // null = transfer manual; 'approved' | 'pending' | 'in_process' | 'rejected' = MP
  const mpStatus = params.status ?? null

  // Fallback: if webhook hasn't fired yet, reconcile rejection directly from MP redirect params
  if (mpStatus === 'rejected' && order.status === 'pending') {
    await updateOrderStatus(orderId, 'pending', 'cancelled')
  }

  return <ConfirmacionClient order={order} mpStatus={mpStatus} transferInfo={transferInfo} />
}
