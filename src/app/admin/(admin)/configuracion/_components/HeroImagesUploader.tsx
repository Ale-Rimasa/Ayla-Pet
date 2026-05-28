'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import {
  uploadHeroImage,
  deleteHeroImage,
  reorderHeroImages,
} from '@/lib/actions/settings'
import { MAX_HERO_IMAGES } from '@/lib/validations/settings'
import type { HeroImage } from '@/types/settings'

const MAX_IMAGES = MAX_HERO_IMAGES

interface Props {
  initialImages: HeroImage[]
}

export function HeroImagesUploader({ initialImages }: Props) {
  const [images, setImages] = useState<HeroImage[]>(initialImages)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleUploadClick() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const fd = new FormData()
    fd.append('file', file)
    // Reset input so same file can be re-selected
    e.target.value = ''

    startTransition(async () => {
      const result = await uploadHeroImage(fd)
      if (result.ok) {
        setImages((prev) => [...prev, result.image])
        toast.success('Imagen agregada')
      } else {
        const messages: Record<string, string> = {
          invalid_file_type: 'Tipo de archivo no permitido (JPG, PNG, WebP, AVIF)',
          file_too_large: 'El archivo supera el límite de 5MB',
          max_images_reached: `Ya tenés el máximo de ${MAX_IMAGES} imágenes`,
          missing_params: 'No se seleccionó ningún archivo',
        }
        toast.error(messages[result.error] ?? 'Error al subir imagen')
      }
    })
  }

  function handleDelete(img: HeroImage) {
    const path = img.url.split('/').pop() ?? ''
    startTransition(async () => {
      const prev = images
      setImages((cur) => cur.filter((i) => i.url !== img.url))
      const result = await deleteHeroImage(img.url, path)
      if (result.ok) {
        toast.success('Imagen eliminada')
      } else {
        setImages(prev) // revert
        toast.error('Error al eliminar imagen')
      }
    })
  }

  function handleMoveUp(idx: number) {
    if (idx === 0) return
    const next = [...images]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    const reindexed = next.map((img, i) => ({ ...img, sortOrder: i }))
    setImages(reindexed)
    startTransition(async () => {
      const result = await reorderHeroImages(reindexed.map((i) => i.url))
      if (!result.ok) {
        setImages(images) // revert
        toast.error('Error al reordenar imágenes')
      } else {
        toast.success('Orden actualizado')
      }
    })
  }

  function handleMoveDown(idx: number) {
    if (idx === images.length - 1) return
    const next = [...images]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    const reindexed = next.map((img, i) => ({ ...img, sortOrder: i }))
    setImages(reindexed)
    startTransition(async () => {
      const result = await reorderHeroImages(reindexed.map((i) => i.url))
      if (!result.ok) {
        setImages(images) // revert
        toast.error('Error al reordenar imágenes')
      } else {
        toast.success('Orden actualizado')
      }
    })
  }

  const atLimit = images.length >= MAX_IMAGES

  return (
    <div className="space-y-4">
      {images.length === 0 ? (
        <div className="flex items-center justify-center rounded-lg border border-dashed border-sf-sand bg-muted/20 p-8 text-sm text-muted-foreground">
          Sin imágenes. Agregá hasta {MAX_IMAGES} fotos para el carrusel.
        </div>
      ) : (
        <div className="space-y-2">
          {images.map((img, idx) => (
            <div
              key={img.url}
              className="flex items-center gap-3 rounded-lg border border-sf-sand bg-white p-2"
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-sf-cream-deep">
                <Image
                  src={img.url}
                  alt={`Imagen ${idx + 1}`}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>

              <span className="flex-1 truncate text-xs text-muted-foreground">
                Imagen {idx + 1}
              </span>

              <div className="flex gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-11 w-11"
                  onClick={() => handleMoveUp(idx)}
                  disabled={idx === 0 || isPending}
                  aria-label="Mover arriba"
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-11 w-11"
                  onClick={() => handleMoveDown(idx)}
                  disabled={idx === images.length - 1 || isPending}
                  aria-label="Mover abajo"
                >
                  ↓
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 text-destructive hover:text-destructive"
                      disabled={isPending}
                    >
                      Eliminar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar imagen?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. La imagen se eliminará del carrusel y del almacenamiento.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(img)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={handleFileChange}
      />

      {!atLimit && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUploadClick}
          disabled={isPending}
        >
          Agregar imagen ({images.length}/{MAX_IMAGES})
        </Button>
      )}

      {atLimit && (
        <p className="text-xs text-muted-foreground">
          Máximo {MAX_IMAGES} imágenes alcanzado.
        </p>
      )}
    </div>
  )
}
