import { notFound } from 'next/navigation'
import { z } from 'zod'
import { getOrderById } from '@/lib/db/orders'
import { getOrderReferencePhotos, getSignedPhotoUrlsForOwner } from '@/lib/actions/order-photos'
import { ORDER_STATUS } from '@/lib/constants'
import type { OrderStatus } from '@/types'
import { OrderPhotosUploaderClient } from './OrderPhotosUploaderClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ orderId: string }>
}

const VALID_UPLOAD_STATUSES: OrderStatus[] = [ORDER_STATUS.PENDING, ORDER_STATUS.PAID, ORDER_STATUS.PROCESSING]
const READ_ONLY_STATUSES: OrderStatus[] = [ORDER_STATUS.SHIPPED, ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED, ORDER_STATUS.REFUNDED]

export default async function MiPedidoFotosPage({ params }: PageProps) {
  const { orderId } = await params

  if (!z.string().uuid().safeParse(orderId).success) notFound()

  const order = await getOrderById(orderId)
  if (!order) notFound()

  const [photosResult, urlsResult] = await Promise.all([
    getOrderReferencePhotos(orderId),
    getSignedPhotoUrlsForOwner(orderId),
  ])

  const photos = photosResult.ok ? photosResult.data : []
  const urlsById = new Map(
    urlsResult.ok ? urlsResult.data.map((u) => [u.id, u.signedUrl]) : []
  )
  const photosWithUrls = photos.map((p) => ({
    ...p,
    signedUrl: urlsById.get(p.id) ?? null,
  }))

  const canUpload = VALID_UPLOAD_STATUSES.includes(order.status)
  const isReadOnly = READ_ONLY_STATUSES.includes(order.status)

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="font-heading text-3xl font-bold">Fotos de referencia</h1>
        <p className="mt-2 text-muted-foreground">
          Pedido #{orderId.slice(0, 8).toUpperCase()}
        </p>
        {!canUpload && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {isReadOnly
              ? 'Esta orden ya no acepta cambios. Solo lectura.'
              : 'Esta orden no acepta cambios.'}
          </p>
        )}
      </header>

      <OrderPhotosUploaderClient
        orderId={orderId}
        initialPhotos={photosWithUrls}
        canUpload={canUpload}
      />
    </div>
  )
}
