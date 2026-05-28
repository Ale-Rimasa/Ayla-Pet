'use client'

import { useState, useTransition } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { updateMaintenance } from '@/lib/actions/settings'

interface Props {
  initial: boolean
}

export function MaintenanceToggle({ initial }: Props) {
  const [enabled, setEnabled] = useState(initial)
  const [isPending, startTransition] = useTransition()

  function handleToggle(checked: boolean) {
    const optimistic = checked
    setEnabled(optimistic)
    startTransition(async () => {
      const result = await updateMaintenance({ enabled: optimistic })
      if (result.ok) {
        toast.success(
          optimistic ? 'Modo mantenimiento activado' : 'Modo mantenimiento desactivado'
        )
      } else {
        setEnabled(!optimistic) // revert
        toast.error('Error al cambiar el modo mantenimiento')
      }
    })
  }

  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div>
        <p className="text-sm font-medium">Modo mantenimiento</p>
        <p className="text-xs text-muted-foreground">
          Los clientes verán una página de &ldquo;próximamente&rdquo; mientras está activo.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Label htmlFor="maintenance-toggle" className="sr-only">
          Modo mantenimiento
        </Label>
        <Switch
          id="maintenance-toggle"
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={isPending}
        />
        <span className="text-sm font-medium text-muted-foreground">
          {enabled ? 'Activo' : 'Inactivo'}
        </span>
      </div>
    </div>
  )
}
