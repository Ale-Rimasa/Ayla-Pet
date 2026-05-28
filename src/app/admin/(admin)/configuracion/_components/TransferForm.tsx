'use client'

import { useState, useTransition } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CardFooter } from '@/components/ui/card'
import { toast } from 'sonner'
import { updateTransferInfo } from '@/lib/actions/settings'
import type { TransferInfo } from '@/types/settings'

interface Props {
  initial: TransferInfo
}

export function TransferForm({ initial }: Props) {
  const [values, setValues] = useState<TransferInfo>(initial)
  const [isPending, startTransition] = useTransition()

  function handleChange(field: keyof TransferInfo) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [field]: e.target.value }))
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await updateTransferInfo(values)
      if (result.ok) {
        toast.success('Datos de transferencia guardados')
      } else {
        toast.error('Error al guardar. Revisá los campos.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="transfer-banco">Banco</Label>
          <Input
            id="transfer-banco"
            value={values.banco}
            onChange={handleChange('banco')}
            maxLength={60}
            required
            disabled={isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="transfer-titular">Titular</Label>
          <Input
            id="transfer-titular"
            value={values.titular}
            onChange={handleChange('titular')}
            maxLength={80}
            required
            disabled={isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="transfer-cbu">CBU</Label>
          <Input
            id="transfer-cbu"
            value={values.cbu}
            onChange={handleChange('cbu')}
            maxLength={22}
            required
            disabled={isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="transfer-alias">Alias</Label>
          <Input
            id="transfer-alias"
            value={values.alias}
            onChange={handleChange('alias')}
            maxLength={40}
            required
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
