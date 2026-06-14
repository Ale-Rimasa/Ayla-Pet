'use client'

import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/utils'
import type { ProductVariant } from '@/types'

interface VariantSelectorProps {
  variants: ProductVariant[]
  selectedId: string | null
  onVariantChange: (variant: ProductVariant) => void
}

export function VariantSelector({
  variants,
  selectedId,
  onVariantChange,
}: VariantSelectorProps) {
  if (variants.length === 0) return null
  if (variants.length === 1 && variants[0].name.toLowerCase() === 'default') return null

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Variante</p>
      <div className="flex flex-wrap gap-2">
        {variants.map((v) => {
          const outOfStock = v.stock === 0
          const isSelected = v.id === selectedId

          return (
            <button
              key={v.id}
              onClick={() => !outOfStock && onVariantChange(v)}
              disabled={outOfStock}
              className={cn(
                'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                isSelected
                  ? 'border-[#cca881] bg-[#cca881] text-[#3a2c1a]'
                  : 'border-border bg-background text-foreground hover:border-[#cca881]',
                outOfStock && 'cursor-not-allowed opacity-40 line-through'
              )}
              aria-pressed={isSelected}
              aria-label={`${v.name} — ${formatPrice(v.price)}${outOfStock ? ' — sin stock' : ''}`}
            >
              {v.name}
              {variants.length > 1 && (
                <span className="ml-1 text-xs opacity-70">{formatPrice(v.price)}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
