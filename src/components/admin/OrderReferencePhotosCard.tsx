import Image from 'next/image'
import { getSignedPhotoUrls } from '@/lib/actions/order-photos'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  orderId: string
}

export async function OrderReferencePhotosCard({ orderId }: Props) {
  const result = await getSignedPhotoUrls(orderId)
  const photos = result.ok ? result.data : []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Fotos de referencia ({photos.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            El cliente aún no subió fotos de referencia.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, idx) => (
              <a
                key={photo.id}
                href={photo.signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block aspect-square overflow-hidden rounded-lg bg-muted"
              >
                <Image
                  src={photo.signedUrl}
                  alt={`Foto de referencia ${idx + 1}`}
                  width={200}
                  height={200}
                  className="h-full w-full object-cover transition-transform hover:scale-105"
                />
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
