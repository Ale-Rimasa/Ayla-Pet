'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function CouponInput() {
  const [code, setCode] = useState('')

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">¿Tenés un cupón?</p>
      <div className="flex gap-2">
        <Input
          placeholder="Ingresá tu código"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="flex-1"
          aria-label="Código de cupón"
        />
        <Button variant="outline" disabled={!code.trim()}>
          Aplicar
        </Button>
      </div>
    </div>
  )
}
