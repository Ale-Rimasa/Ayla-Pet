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
  searchParams: Promise<{ orderId?: string }>
}

export default async function ConfirmacionPage({ searchParams }: Props) {
  const { orderId } = await searchParams

  if (!orderId) redirect('/')

  const order = await getOrderById(orderId)
  if (!order) redirect('/')

  return <ConfirmacionClient order={order} />
}
