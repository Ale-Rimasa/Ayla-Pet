'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Box, CheckCircle2, AlertTriangle, XCircle, Pencil, LoaderCircle, Ruler, Weight } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { updatePackageProfile } from '@/lib/actions/shipping'
import type { ShippingPackageProfile } from '@/types/shipping'

const positiveNumberOrEmpty = z
  .string()
  .refine((v) => v === '' || (!isNaN(Number(v)) && Number(v) > 0), 'Debe ser un número mayor a 0')

const formSchema = z.object({
  label:    z.string().min(1, 'El nombre es obligatorio'),
  weightG:  positiveNumberOrEmpty,
  heightCm: positiveNumberOrEmpty,
  widthCm:  positiveNumberOrEmpty,
  lengthCm: positiveNumberOrEmpty,
  isActive: z.boolean(),
}).superRefine((data, ctx) => {
  if (data.isActive && (!data.weightG || !data.heightCm || !data.widthCm || !data.lengthCm)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'No se puede activar sin peso y todas las dimensiones completas',
      path: ['isActive'],
    })
  }
})

type FormValues = z.infer<typeof formSchema>

function profileStatus(p: ShippingPackageProfile): 'active' | 'incomplete' | 'inactive' {
  if (!p.weightG || !p.heightMm || !p.widthMm || !p.lengthMm) return 'incomplete'
  if (!p.isActive) return 'inactive'
  return 'active'
}

function StatusBadgePackage({ profile }: { profile: ShippingPackageProfile }) {
  const status = profileStatus(profile)
  if (status === 'active') {
    return (
      <Badge className="gap-1 bg-green-100 text-green-800">
        <CheckCircle2 className="h-3 w-3" /> Activo
      </Badge>
    )
  }
  if (status === 'incomplete') {
    return (
      <Badge variant="outline" className="gap-1 text-amber-700 border-amber-300">
        <AlertTriangle className="h-3 w-3" /> Sin medidas
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <XCircle className="h-3 w-3" /> Inactivo
    </Badge>
  )
}

interface Props {
  profiles: ShippingPackageProfile[]
}

export function PackageProfilesPageClient({ profiles }: Props) {
  const [editing, setEditing] = useState<ShippingPackageProfile | null>(null)
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) })

  const isActive = watch('isActive')

  function openEdit(profile: ShippingPackageProfile) {
    reset({
      label:    profile.label,
      weightG:  profile.weightG  ? String(profile.weightG)          : '',
      heightCm: profile.heightMm ? String(profile.heightMm / 10)    : '',
      widthCm:  profile.widthMm  ? String(profile.widthMm  / 10)    : '',
      lengthCm: profile.lengthMm ? String(profile.lengthMm / 10)    : '',
      isActive: profile.isActive,
    })
    setEditing(profile)
  }

  function onSubmit(values: FormValues) {
    if (!editing) return

    startTransition(async () => {
      const result = await updatePackageProfile(editing.id, {
        label:    values.label,
        weightG:  values.weightG  ? Number(values.weightG)  : null,
        heightCm: values.heightCm ? Number(values.heightCm) : null,
        widthCm:  values.widthCm  ? Number(values.widthCm)  : null,
        lengthCm: values.lengthCm ? Number(values.lengthCm) : null,
        isActive: values.isActive,
      })

      if (result.ok) {
        toast.success('Embalaje actualizado')
        setEditing(null)
      } else {
        toast.error(result.error ?? 'Error al guardar')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Embalajes</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Perfiles físicos de cajas. Activar solo cuando las medidas reales estén confirmadas.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {profiles.map((profile) => {
          const status = profileStatus(profile)
          return (
            <div
              key={profile.id}
              className="rounded-xl border bg-card p-5 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Box className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-semibold text-sm">{profile.label}</p>
                    <p className="text-xs text-muted-foreground font-mono">{profile.id}</p>
                  </div>
                </div>
                <StatusBadgePackage profile={profile} />
              </div>

              {profile.weightG ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Peso</p>
                    <p className="font-medium">{profile.weightG} g</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Dimensiones (cm)</p>
                    <p className="font-medium">
                      {profile.heightMm / 10} × {profile.widthMm / 10} × {profile.lengthMm / 10}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-amber-600">
                  ⚠ Sin medidas — este embalaje no puede activarse ni cotizar envíos
                </p>
              )}

              {status === 'inactive' && profile.weightG && (
                <p className="text-xs text-muted-foreground">
                  Tiene medidas pero está desactivado. Activarlo para habilitar cotizaciones.
                </p>
              )}

              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => openEdit(profile)}
              >
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Editar
              </Button>
            </div>
          )
        })}
      </div>

      {/* Sheet de edición */}
      <Sheet open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent
          side="right"
          className="w-full max-w-lg overflow-y-auto border-l bg-background p-0"
        >
          <SheetHeader className="border-b bg-muted/30 px-6 py-5">
            <div className="flex items-center gap-3 pr-10">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-background text-primary shadow-sm">
                <Box className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <SheetTitle className="text-xl font-semibold tracking-tight">
                  Editar embalaje
                </SheetTitle>
                <SheetDescription>
                  Ingresá las medidas en centímetros — se guardan en milímetros.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col">
            <div className="space-y-5 px-6 py-6">

              {/* Nombre */}
              <section className="rounded-2xl border bg-card p-4 shadow-sm">
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Box className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Nombre visible</h3>
                    <p className="text-muted-foreground text-xs leading-5">
                      Se muestra en el panel al asignar variantes.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="pkg-label"
                    className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    Nombre *
                  </Label>
                  <Input id="pkg-label" className="h-11" {...register('label')} />
                  {errors.label && (
                    <p className="text-xs font-medium text-destructive">{errors.label.message}</p>
                  )}
                </div>
              </section>

              {/* Medidas */}
              <section className="rounded-2xl border bg-card p-4 shadow-sm">
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Ruler className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Dimensiones y peso</h3>
                    <p className="text-muted-foreground text-xs leading-5">
                      Medidas del paquete embalado, no del producto.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="pkg-weight"
                      className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    >
                      Peso embalado (g)
                    </Label>
                    <div className="relative">
                      <Weight className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="pkg-weight"
                        type="number"
                        step="1"
                        min="1"
                        className="h-11 pl-9"
                        {...register('weightG')}
                      />
                    </div>
                    {errors.weightG && (
                      <p className="text-xs font-medium text-destructive">{errors.weightG.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label
                        htmlFor="pkg-height"
                        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                      >
                        Alto (cm)
                      </Label>
                      <Input
                        id="pkg-height"
                        type="number"
                        step="0.1"
                        min="0.1"
                        className="h-11"
                        {...register('heightCm')}
                      />
                      {errors.heightCm && (
                        <p className="text-xs font-medium text-destructive">{errors.heightCm.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="pkg-width"
                        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                      >
                        Ancho (cm)
                      </Label>
                      <Input
                        id="pkg-width"
                        type="number"
                        step="0.1"
                        min="0.1"
                        className="h-11"
                        {...register('widthCm')}
                      />
                      {errors.widthCm && (
                        <p className="text-xs font-medium text-destructive">{errors.widthCm.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="pkg-length"
                        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                      >
                        Largo (cm)
                      </Label>
                      <Input
                        id="pkg-length"
                        type="number"
                        step="0.1"
                        min="0.1"
                        className="h-11"
                        {...register('lengthCm')}
                      />
                      {errors.lengthCm && (
                        <p className="text-xs font-medium text-destructive">{errors.lengthCm.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Estado */}
              <section className="rounded-2xl border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Activo</p>
                      <p className="text-xs text-muted-foreground leading-5">
                        Solo activar si las medidas son definitivas.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={isActive}
                    onCheckedChange={(v: boolean) => setValue('isActive', v)}
                  />
                </div>
              </section>

            </div>

            {/* Footer sticky */}
            <div className="sticky bottom-0 mt-auto flex flex-col-reverse gap-3 border-t bg-background/95 px-6 py-4 backdrop-blur sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setEditing(null)}
                className="h-11 sm:min-w-28"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="lg"
                disabled={isPending}
                className="h-11 sm:min-w-40"
              >
                {isPending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {isPending ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
