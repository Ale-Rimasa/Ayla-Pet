import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getOrderById, updateOrderStatus } from '@/lib/db/orders'
import { getTransferInfo } from '@/lib/db/site-settings'
import { fetchPayment } from '@/lib/payments'
import type { OrderStatus } from '@/types'
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

// Maps the order status (persisted by the signature-verified webhook) to the
// display status the UI understands. Used as the server-side source of truth
// when the payment cannot be fetched directly from MercadoPago.
function orderStatusToDisplay(status: OrderStatus): string {
  switch (status) {
    case 'paid':
    case 'processing':
    case 'shipped':
    case 'delivered':
      return 'approved'
    case 'cancelled':
    case 'refunded':
      return 'rejected'
    default:
      return 'pending'
  }
}

export default async function ConfirmacionPage({ searchParams }: Props) {
  const params = await searchParams

  // Transfer uses ?orderId=, MP uses ?external_reference=
  const isMpFlow = !!params.external_reference
  const orderId = params.orderId ?? params.external_reference
  if (!orderId) redirect('/')

  const [order, transferInfo] = await Promise.all([
    getOrderById(orderId),
    getTransferInfo(),
  ])
  if (!order) redirect('/')

  // null = transfer manual. For MercadoPago we NEVER trust the ?status= query
  // param — it travels in the redirect URL and is forgeable by the buyer.
  // Resolve the real status server-side instead.
  let mpStatus: string | null = null
  if (isMpFlow) {
    // 1. Authoritative: read the payment from MP and confirm it belongs to this order.
    if (params.payment_id) {
      const payment = await fetchPayment(params.payment_id)
      if (payment.ok && payment.data.orderId === orderId) {
        mpStatus = payment.data.status
      }
    }
    // 2. Fallback to the status the verified webhook already persisted on the order.
    if (!mpStatus) {
      mpStatus = orderStatusToDisplay(order.status)
    }
  }

  // Reconcile a confirmed rejection if the webhook hasn't fired yet.
  if (mpStatus === 'rejected' && order.status === 'pending') {
    await updateOrderStatus(orderId, 'pending', 'cancelled')
  }

  return <ConfirmacionClient order={order} mpStatus={mpStatus} transferInfo={transferInfo} />
}
