'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { ProductImage } from '@/types'

interface ProductGalleryProps {
  images: ProductImage[]
  productName: string
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [selected, setSelected] = useState(0)

  if (images.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-muted text-muted-foreground">
        Sin imagen
      </div>
    )
  }

  const current = images[selected]

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
        <Image
          src={current.url}
          alt={current.alt ?? `${productName} — imagen ${selected + 1}`}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          priority={selected === 0}
        />
        {current.label && (
          <span className="absolute bottom-3 left-3 rounded bg-white/90 px-2.5 py-1 text-xs font-medium text-foreground shadow">
            {current.label}
          </span>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, idx) => (
            <button
              key={img.id}
              onClick={() => setSelected(idx)}
              className={cn(
                'relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 transition-colors',
                idx === selected
                  ? 'border-primary'
                  : 'border-border hover:border-muted-foreground'
              )}
              aria-label={img.label ?? `Ver imagen ${idx + 1}`}
              aria-current={idx === selected}
            >
              <Image
                src={img.url}
                alt={img.alt ?? `${productName} — miniatura ${idx + 1}`}
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
