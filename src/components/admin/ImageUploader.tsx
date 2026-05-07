'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ImageUploaderProps {
  currentUrl?: string
  onFileSelect: (file: File) => void
  onRemove?: () => void
  className?: string
  previewClassName?: string
  previewWrapperClassName?: string
  imageSizes?: string
}

export function ImageUploader({
  currentUrl,
  onFileSelect,
  onRemove,
  className,
  previewClassName,
  previewWrapperClassName,
  imageSizes = '128px',
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setPreview(event.target?.result as string)
    }
    reader.readAsDataURL(file)
    onFileSelect(file)
  }

  const displayUrl = preview ?? currentUrl

  return (
    <div className={cn('space-y-2', className)}>
      {displayUrl ? (
        <div className={cn('relative inline-block', previewWrapperClassName)}>
          <div
            className={cn(
              'relative h-32 w-32 overflow-hidden rounded-lg border',
              previewClassName
            )}
          >
            <Image
              src={displayUrl}
              alt="Preview"
              fill
              className="object-cover"
              sizes={imageSizes}
            />
          </div>
          {onRemove && (
            <button
              type="button"
              onClick={() => {
                setPreview(null)
                onRemove()
              }}
              aria-label="Quitar imagen"
              className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow transition-colors hover:bg-destructive/90"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex h-32 w-32 cursor-pointer flex-col items-center justify-center gap-2',
            'rounded-lg border-2 border-dashed border-border',
            'text-muted-foreground transition-colors hover:border-primary hover:text-primary',
            'focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
            previewClassName
          )}
        >
          <Upload className="h-6 w-6" aria-hidden="true" />
          <span className="text-xs text-center">Subir imagen</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {displayUrl && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          Cambiar imagen
        </Button>
      )}
    </div>
  )
}
