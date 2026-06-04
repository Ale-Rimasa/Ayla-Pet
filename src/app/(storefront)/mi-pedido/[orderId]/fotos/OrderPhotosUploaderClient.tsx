'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Plus, Trash2, ImageIcon, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { uploadOrderReferencePhoto, deleteOrderReferencePhoto } from '@/lib/actions/order-photos'
import type { OrderReferencePhotoForClient } from '@/types'

const MAX_PHOTOS = 3
const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

const ERROR_MESSAGES: Record<string, string> = {
  PHOTO_LIMIT_REACHED: 'Ya tenés 3 fotos cargadas. Eliminá una para agregar otra.',
  INVALID_MIME_TYPE: 'Solo se aceptan fotos JPEG, PNG, WebP o AVIF.',
  FILE_TOO_LARGE: 'El archivo supera los 5 MB.',
  ORDER_NOT_PAYABLE: 'Esta orden ya no acepta cambios.',
  STORAGE_UPLOAD_FAILED: 'Error al subir la foto. Intentá de nuevo.',
  STORAGE_DELETE_FAILED: 'Error al eliminar la foto. Intentá de nuevo.',
  RATE_LIMITED: 'Demasiados intentos. Esperá un momento.',
  INTERNAL_ERROR: 'Error inesperado. Intentá de nuevo.',
}

type PhotoWithUrl = OrderReferencePhotoForClient & { signedUrl: string | null }

interface Props {
  orderId: string
  initialPhotos: PhotoWithUrl[]
  canUpload: boolean
}

export function OrderPhotosUploaderClient({ orderId, initialPhotos, canUpload }: Props) {
  const router = useRouter()
  const [photos, setPhotos] = useState<PhotoWithUrl[]>(initialPhotos)
  const [isPending, startTransition] = useTransition()
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [showGrabarModal, setShowGrabarModal] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleCloseGrabarModal(open: boolean) {
    if (!open) router.push('/')
  }

  function handleAddClick() {
    if (!canUpload || photos.length >= MAX_PHOTOS || isPending) return
    inputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset input so the same file can be re-selected if needed
    e.target.value = ''

    if (!ALLOWED_MIME.includes(file.type)) {
      toast.error(ERROR_MESSAGES['INVALID_MIME_TYPE'])
      return
    }
    if (file.size > MAX_SIZE || file.size === 0) {
      toast.error(ERROR_MESSAGES['FILE_TOO_LARGE'])
      return
    }

    const fd = new FormData()
    fd.append('orderId', orderId)
    fd.append('file', file)

    startTransition(async () => {
      const result = await uploadOrderReferencePhoto(fd)
      if (!result.ok) {
        toast.error(ERROR_MESSAGES[result.error] ?? 'Error al subir la foto.')
        return
      }
      setPhotos((prev) => [
        ...prev,
        {
          id: result.data.id,
          orderId,
          displayOrder: result.data.displayOrder,
          mimeType: file.type as OrderReferencePhotoForClient['mimeType'],
          sizeBytes: file.size,
          createdAt: new Date().toISOString(),
          signedUrl: null,
        },
      ])
      toast.success('Foto cargada correctamente.')
    })
  }

  function handleDeleteConfirm() {
    if (!deleteConfirmId) return
    const photoId = deleteConfirmId
    setDeleteConfirmId(null)

    startTransition(async () => {
      const result = await deleteOrderReferencePhoto(photoId, orderId)
      if (!result.ok) {
        toast.error(ERROR_MESSAGES[result.error] ?? 'Error al eliminar la foto.')
        return
      }
      setPhotos((prev) => prev.filter((p) => p.id !== photoId))
      toast.success('Foto eliminada.')
    })
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {photos.length} de {MAX_PHOTOS} fotos cargadas
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((photo, idx) => (
          <div
            key={photo.id}
            className="relative aspect-square overflow-hidden rounded-xl border border-border bg-muted"
          >
            {photo.signedUrl ? (
              <Image
                src={photo.signedUrl}
                alt={`Foto de referencia ${idx + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, 33vw"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
              </div>
            )}

            {idx === 0 && (
              <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                Principal
              </span>
            )}

            {canUpload && (
              <button
                onClick={() => setDeleteConfirmId(photo.id)}
                disabled={isPending}
                aria-label="Eliminar foto"
                className="absolute right-1 top-1 rounded-full bg-destructive p-2 text-destructive-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}

        {canUpload && photos.length < MAX_PHOTOS && (
          <button
            onClick={handleAddClick}
            disabled={isPending}
            className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/50 transition-colors hover:border-primary/50 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Agregar foto"
          >
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <Plus className="h-6 w-6" />
              <span className="text-xs font-medium">Agregar</span>
            </div>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="sr-only"
        onChange={handleFileChange}
        aria-hidden="true"
      />

      {isPending && (
        <p className="mt-3 text-center text-sm text-muted-foreground">Procesando…</p>
      )}

      {photos.length >= 1 && (
        <div className="mt-8">
          <Button
            size="lg"
            className="w-full gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90"
            onClick={() => setShowGrabarModal(true)}
            disabled={isPending}
          >
            <Sparkles className="h-5 w-5" />
            Grabar
          </Button>
        </div>
      )}

      <Dialog open={showGrabarModal} onOpenChange={handleCloseGrabarModal}>
        <DialogContent className="max-w-sm text-center">
          <div className="flex justify-center pt-2">
            <Image
              src="/logo-new.png"
              alt="Ayla"
              width={100}
              height={100}
              className="object-contain"
            />
          </div>
          <DialogHeader className="mt-2">
            <DialogTitle className="text-center font-heading text-2xl">
              ¡Listo!
            </DialogTitle>
            <DialogDescription className="text-center text-base leading-relaxed">
              Gracias, ya recibimos tu pedido. A la brevedad nos contactaremos con vos para mostrarte el diseño a grabar.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta foto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
