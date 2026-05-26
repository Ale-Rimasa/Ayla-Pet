'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import {
  upsertShippingPackageProfile,
  setVariantShippingPackages,
} from '@/lib/db/shipping'
import { z } from 'zod'

// ─── Schemas ──────────────────────────────────────────────────────────────────

const updateProfileSchema = z.object({
  label: z.string().min(1, 'El nombre es obligatorio'),
  // cm en UI → mm en DB (multiplicar × 10)
  heightCm: z.number().positive('Alto debe ser mayor a 0').nullable(),
  widthCm:  z.number().positive('Ancho debe ser mayor a 0').nullable(),
  lengthCm: z.number().positive('Largo debe ser mayor a 0').nullable(),
  weightG:  z.number().int().positive('Peso debe ser mayor a 0').nullable(),
  isActive: z.boolean(),
})

const variantPackagesSchema = z.array(
  z.object({
    profileId: z.string().min(1),
    quantity:  z.number().int().min(1).max(10),
  })
)

// ─── Acciones ─────────────────────────────────────────────────────────────────

export async function updatePackageProfile(
  id: string,
  formData: unknown
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()

  const parsed = updateProfileSchema.safeParse(formData)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().formErrors.join(', ') }
  }

  const { label, heightCm, widthCm, lengthCm, weightG, isActive } = parsed.data

  // Convertir cm a mm para almacenar
  const result = await upsertShippingPackageProfile(id, {
    label,
    weightG,
    heightMm: heightCm !== null ? Math.round(heightCm * 10) : null,
    widthMm:  widthCm  !== null ? Math.round(widthCm  * 10) : null,
    lengthMm: lengthCm !== null ? Math.round(lengthCm * 10) : null,
    isActive,
  })

  if (!result.ok) return result

  revalidatePath('/admin/embalajes')
  return { ok: true }
}

export async function saveVariantPackages(
  variantId: string,
  rawPackages: unknown
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()

  const parsed = variantPackagesSchema.safeParse(rawPackages)
  if (!parsed.success) {
    return { ok: false, error: 'Configuración de embalajes inválida' }
  }

  const result = await setVariantShippingPackages(variantId, parsed.data)
  if (!result.ok) return result

  revalidatePath('/admin/productos')
  return { ok: true }
}
