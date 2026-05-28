'use client'

import { useState, useTransition } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { CardFooter } from '@/components/ui/card'
import { toast } from 'sonner'
import { updateHeroCopy } from '@/lib/actions/settings'

interface Props {
  initial: {
    title: string
    subtitle: string
  }
}

export function HeroSettingsForm({ initial }: Props) {
  const [title, setTitle] = useState(initial.title)
  const [subtitle, setSubtitle] = useState(initial.subtitle)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await updateHeroCopy({ title, subtitle })
      if (result.ok) {
        toast.success('Texto del hero actualizado')
      } else {
        toast.error('Error al guardar. Revisá los campos.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="hero-title">Título</Label>
        <Input
          id="hero-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          required
          disabled={isPending}
        />
        <p className="text-xs text-muted-foreground">{title.length}/80 caracteres</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="hero-subtitle">Subtítulo</Label>
        <Textarea
          id="hero-subtitle"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          maxLength={160}
          rows={3}
          required
          disabled={isPending}
        />
        <p className="text-xs text-muted-foreground">{subtitle.length}/160 caracteres</p>
      </div>

      <CardFooter className="px-0 pb-0 justify-end">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </CardFooter>
    </form>
  )
}
