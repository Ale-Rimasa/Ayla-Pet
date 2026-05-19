'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { ArrowDown, ArrowUp, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { uploadProductImage, createProductImage, deleteProductImage, updateProductImage, reorderProductImages } from '@/lib/actions/products'
import type { ProductImage } from '@/types'

interface MultiImageUploaderProps {
  productId: string
  images: ProductImage[]
  onImagesChange: (images: ProductImage[]) => void
}

export function MultiImageUploader({ productId, images, onImagesChange }: MultiImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  function handleUpload(file: File) {
    startTransition(async () => {
      const formData = new FormData()
      formData.append('file', file)
      const uploadResult = await uploadProductImage(formData)
      if (!uploadResult.ok) {
        toast.error(`Error al subir imagen: ${uploadResult.error}`)
        return
      }

      const insertResult = await createProductImage({
        productId,
        url: uploadResult.url,
        sortOrder: images.length,
      })
      if (!insertResult.ok) {
        toast.error((insertResult as { ok: false; error: string }).error === 'max_images_reached'
          ? 'Máximo 8 imágenes por producto'
          : 'Error al guardar imagen')
        return
      }

      const newImage: ProductImage = {
        id: (insertResult.data as { id: string }).id,
        productId,
        url: uploadResult.url,
        sortOrder: images.length,
        createdAt: new Date().toISOString(),
      }
      onImagesChange([...images, newImage])
      toast.success('Imagen agregada')
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteProductImage(id)
      if (!result.ok) {
        toast.error(result.error ?? 'Error al eliminar imagen')
        return
      }
      const updated = images
        .filter((img) => img.id !== id)
        .map((img, idx) => ({ ...img, sortOrder: idx }))
      onImagesChange(updated)
      toast.success('Imagen eliminada')
    })
  }

  function handleMove(index: number, direction: 'up' | 'down') {
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= images.length) return

    const reordered = [...images]
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    const withOrder = reordered.map((img, idx) => ({ ...img, sortOrder: idx }))
    onImagesChange(withOrder)

    startTransition(async () => {
      const result = await reorderProductImages(productId, withOrder.map((img) => img.id))
      if (!result.ok) {
        toast.error(result.error ?? 'Error al reordenar')
        onImagesChange(images)
      }
    })
  }

  function handleSaveLabel(id: string, alt: string, label: string) {
    startTransition(async () => {
      const result = await updateProductImage({ id, alt: alt || undefined, label: label || undefined })
      if (!result.ok) {
        toast.error(result.error ?? 'Error al guardar')
        return
      }
      onImagesChange(images.map((img) => img.id === id ? { ...img, alt: alt || undefined, label: label || undefined } : img))
      toast.success('Guardado')
    })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((img, idx) => (
          <ImageCard
            key={img.id}
            image={img}
            index={idx}
            total={images.length}
            isPending={isPending}
            onMove={handleMove}
            onRequestDelete={setDeleteConfirmId}
            onSaveLabel={handleSaveLabel}
          />
        ))}
      </div>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar imagen?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteConfirmId) handleDelete(deleteConfirmId) }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {images.length < 8 && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => inputRef.current?.click()}
          className="flex h-24 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Upload className="h-5 w-5" aria-hidden="true" />
          <span className="text-sm">Agregar imagen ({images.length}/8)</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleUpload(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}

interface ImageCardProps {
  image: ProductImage
  index: number
  total: number
  isPending: boolean
  onMove: (index: number, direction: 'up' | 'down') => void
  onRequestDelete: (id: string) => void
  onSaveLabel: (id: string, alt: string, label: string) => void
}

function ImageCard({ image, index, total, isPending, onMove, onRequestDelete, onSaveLabel }: ImageCardProps) {
  return (
    <div className="group relative rounded-xl border bg-card p-2 shadow-sm">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
        <Image
          src={image.url}
          alt={image.alt ?? `Imagen ${index + 1}`}
          fill
          sizes="200px"
          className="object-cover"
        />
        {index === 0 && (
          <span className="absolute left-1.5 top-1.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
            Principal
          </span>
        )}
      </div>

      <div className="mt-2 space-y-1.5">
        <EditableField
          label="Label"
          defaultValue={image.label ?? ''}
          placeholder="Frente, Dorso…"
          onSave={(label) => onSaveLabel(image.id, image.alt ?? '', label)}
          disabled={isPending}
        />

        <div className="flex items-center justify-between gap-1">
          <div className="flex gap-0.5">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              disabled={isPending || index === 0}
              onClick={() => onMove(index, 'up')}
              aria-label="Mover arriba"
            >
              <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              disabled={isPending || index === total - 1}
              onClick={() => onMove(index, 'down')}
              aria-label="Mover abajo"
            >
              <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>

          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={isPending}
            className="text-destructive hover:text-destructive"
            aria-label="Eliminar imagen"
            onClick={() => onRequestDelete(image.id)}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  )
}

interface EditableFieldProps {
  label: string
  defaultValue: string
  placeholder: string
  onSave: (value: string) => void
  disabled: boolean
}

function EditableField({ label, defaultValue, placeholder, onSave, disabled }: EditableFieldProps) {
  return (
    <div className="flex items-center gap-1">
      <Input
        aria-label={label}
        defaultValue={defaultValue}
        placeholder={placeholder}
        disabled={disabled}
        className="h-7 text-xs"
        onBlur={(e) => {
          if (e.target.value !== defaultValue) onSave(e.target.value)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            ;(e.target as HTMLInputElement).blur()
          }
        }}
      />
    </div>
  )
}
