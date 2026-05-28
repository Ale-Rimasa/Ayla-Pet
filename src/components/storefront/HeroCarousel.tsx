'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import type { HeroImage } from '@/types/settings'

interface HeroCarouselProps {
  images: HeroImage[]        // pre-sorted, max 3
  fallbackSrc: string        // static image to show when images is empty
  alt: string
  intervalMs?: number        // default 5000ms
}

export function HeroCarousel({
  images,
  fallbackSrc,
  alt,
  intervalMs = 5000,
}: HeroCarouselProps) {
  const slides = images.length > 0 ? images.map((i) => i.url) : [fallbackSrc]
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (slides.length <= 1) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length)
    }, intervalMs)
    return () => clearInterval(id)
  }, [slides.length, intervalMs])

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      aria-label="Carrusel de imágenes del hero"
      aria-live="off"
    >
      {slides.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt={i === 0 ? alt : ''}
          fill
          priority={i === 0}
          sizes="(max-width: 1024px) 100vw, 50vw"
          className={`object-cover transition-opacity duration-700 ${
            i === index ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}

      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ir a imagen ${i + 1}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className="flex h-11 w-11 shrink-0 items-center justify-center"
            >
              <span
                className={`h-2 w-2 rounded-full transition-colors ${
                  i === index ? 'bg-sf-ink' : 'bg-sf-ink/30'
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
