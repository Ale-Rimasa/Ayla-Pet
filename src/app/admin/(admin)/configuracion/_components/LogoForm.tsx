'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { uploadLogo, removeLogo } from '@/lib/actions/settings'
import type { BrandingConfig } from '@/types/settings'

interface Props {
  initial: BrandingConfig
}

export function LogoForm({ initial }: Props) {
  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logoUrl)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const displaySrc = logoUrl ?? '/logo.png'

  function handleUploadClick() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    e.target.value = ''

    startTransition(async () => {
      const result = await uploadLogo(fd)
      if (result.ok) {
        setLogoUrl(result.url)
        toast.success('Logo actualizado')
      } else {
        const messages: Record<string, string> = {
          invalid_file_type: 'Tipo de archivo no permitido (JPG, PNG, WebP, AVIF)',
          file_too_large: 'El archivo supera el límite de 2MB',
          missing_params: 'No se seleccionó ningún archivo',
        }
        toast.error(messages[result.error] ?? 'Error al subir logo')
      }
    })
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await removeLogo()
      if (result.ok) {
        setLogoUrl(null)
        toast.success('Logo eliminado')
      } else {
        toast.error('Error al eliminar logo')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center rounded-lg border bg-muted/30 p-6">
        <Image
          src={displaySrc}
          alt="Logo de la tienda"
          width={96}
          height={96}
          className="rounded-full object-cover"
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={handleUploadClick}
          disabled={isPending}
        >
          Cambiar logo
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleRemove}
          disabled={isPending || !logoUrl}
        >
          Eliminar
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        PNG, JPG, WebP o AVIF. Máx. 2MB.
      </p>
    </div>
  )
}
