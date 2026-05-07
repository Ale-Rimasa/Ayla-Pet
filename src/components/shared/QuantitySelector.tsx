'use client'

import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface QuantitySelectorProps {
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
  disabled?: boolean
}

export function QuantitySelector({
  value,
  min = 1,
  max,
  onChange,
  disabled = false,
}: QuantitySelectorProps) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        aria-label="Reducir cantidad"
      >
        <Minus className="h-3 w-3" />
      </Button>
      <span
        className="w-8 text-center text-sm font-medium tabular-nums"
        aria-live="polite"
        aria-label={`Cantidad: ${value}`}
      >
        {value}
      </span>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onChange(max !== undefined ? Math.min(max, value + 1) : value + 1)}
        disabled={disabled || (max !== undefined && value >= max)}
        aria-label="Aumentar cantidad"
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  )
}
