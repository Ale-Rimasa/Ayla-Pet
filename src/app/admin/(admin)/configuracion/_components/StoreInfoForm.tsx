'use client'

import { useState, useTransition } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CardFooter } from '@/components/ui/card'
import { toast } from 'sonner'
import { updateStoreInfo } from '@/lib/actions/settings'
import type { StoreInfo } from '@/types/settings'

interface Props {
  initial: StoreInfo
}

export function StoreInfoForm({ initial }: Props) {
  const [values, setValues] = useState<StoreInfo>(initial)
  const [isPending, startTransition] = useTransition()

  function handleChange(field: keyof StoreInfo) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [field]: e.target.value }))
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await updateStoreInfo(values)
      if (result.ok) {
        toast.success('Información guardada')
      } else {
        toast.error('Error al guardar. Revisá los campos.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="store-name">Nombre de la tienda</Label>
          <Input
            id="store-name"
            value={values.name}
            onChange={handleChange('name')}
            maxLength={60}
            required
            disabled={isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="store-email">Email de contacto</Label>
          <Input
            id="store-email"
            type="email"
            value={values.email}
            onChange={handleChange('email')}
            required
            disabled={isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="store-domain">Dominio</Label>
          <Input
            id="store-domain"
            value={values.domain}
            onChange={handleChange('domain')}
            maxLength={120}
            required
            disabled={isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="store-instagram">Instagram</Label>
          <Input
            id="store-instagram"
            value={values.instagram}
            onChange={handleChange('instagram')}
            disabled={isPending}
          />
        </div>
      </div>
      <CardFooter className="px-0 pb-0 mt-4 justify-between">
        <span className="text-xs text-muted-foreground">
          Estos valores reemplazan los de <code className="rounded bg-muted px-1 py-0.5 text-xs">lib/constants.ts</code>
        </span>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </CardFooter>
    </form>
  )
}
