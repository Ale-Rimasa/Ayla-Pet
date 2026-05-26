import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth'
import type { Database } from '@/types/database'
import type { ShippingPackageProfile } from '@/types/shipping'

type DbProfile = Database['public']['Tables']['shipping_package_profiles']['Row']

function mapProfile(row: DbProfile): ShippingPackageProfile {
  return {
    id: row.id,
    label: row.label,
    weightG: row.weight_g ?? 0,
    heightMm: row.height_mm ?? 0,
    widthMm: row.width_mm ?? 0,
    lengthMm: row.length_mm ?? 0,
    isActive: row.is_active,
  }
}

// ─── Lectura ──────────────────────────────────────────────────────────────────

/**
 * Devuelve todos los perfiles de paquete.
 * Defense-in-depth: service-role bypasses RLS — requiere sesión admin.
 */
export async function getShippingPackageProfiles(): Promise<ShippingPackageProfile[]> {
  await requireAdmin()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('shipping_package_profiles')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw new Error(`getShippingPackageProfiles: ${error.message}`)
  return data.map(mapProfile)
}

export async function getShippingPackageProfile(
  id: string
): Promise<ShippingPackageProfile | null> {
  await requireAdmin()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('shipping_package_profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`getShippingPackageProfile: ${error.message}`)
  if (!data) return null
  return mapProfile(data)
}

/**
 * Para cada variantId, devuelve sus filas en variant_shipping_packages
 * incluyendo el perfil de paquete completo.
 * Usa service role — nunca llamar desde el cliente.
 */
export async function getPackageProfilesForVariants(
  variantIds: string[]
): Promise<Map<string, Array<{ profile: ShippingPackageProfile; quantity: number }>>> {
  if (variantIds.length === 0) return new Map()

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('variant_shipping_packages')
    .select('variant_id, quantity, shipping_package_profiles(*)')
    .in('variant_id', variantIds)

  if (error) throw new Error(`getPackageProfilesForVariants: ${error.message}`)

  const result = new Map<string, Array<{ profile: ShippingPackageProfile; quantity: number }>>()
  for (const variantId of variantIds) {
    result.set(variantId, [])
  }

  for (const row of data) {
    const profileRow = row.shipping_package_profiles as DbProfile
    const existing = result.get(row.variant_id) ?? []
    existing.push({ profile: mapProfile(profileRow), quantity: row.quantity })
    result.set(row.variant_id, existing)
  }

  return result
}

/**
 * Devuelve los paquetes asignados a una variante específica.
 * Defense-in-depth: service-role bypasses RLS — requiere sesión admin.
 */
export async function getVariantShippingPackages(
  variantId: string
): Promise<Array<{ profileId: string; label: string; quantity: number; isActive: boolean }>> {
  await requireAdmin()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('variant_shipping_packages')
    .select('quantity, shipping_package_profiles(id, label, is_active)')
    .eq('variant_id', variantId)

  if (error) throw new Error(`getVariantShippingPackages: ${error.message}`)

  return data.map((row) => {
    const p = row.shipping_package_profiles as { id: string; label: string; is_active: boolean }
    return {
      profileId: p.id,
      label: p.label,
      quantity: row.quantity,
      isActive: p.is_active,
    }
  })
}

// ─── Escritura (admin) ────────────────────────────────────────────────────────

export interface UpsertProfileData {
  label: string
  weightG: number | null
  heightMm: number | null
  widthMm: number | null
  lengthMm: number | null
  isActive: boolean
}

export async function upsertShippingPackageProfile(
  id: string,
  data: UpsertProfileData
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('shipping_package_profiles')
    .update({
      label: data.label,
      weight_g: data.weightG,
      height_mm: data.heightMm,
      width_mm: data.widthMm,
      length_mm: data.lengthMm,
      is_active: data.isActive,
    })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * Reemplaza todas las asignaciones de paquetes para una variante.
 * Opera como set — elimina lo viejo, inserta lo nuevo.
 */
export async function setVariantShippingPackages(
  variantId: string,
  packages: Array<{ profileId: string; quantity: number }>
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()
  const supabase = createAdminClient()

  const { error: deleteError } = await supabase
    .from('variant_shipping_packages')
    .delete()
    .eq('variant_id', variantId)

  if (deleteError) return { ok: false, error: deleteError.message }

  if (packages.length === 0) return { ok: true }

  const { error: insertError } = await supabase
    .from('variant_shipping_packages')
    .insert(
      packages.map((p) => ({
        variant_id: variantId,
        package_profile_id: p.profileId,
        quantity: p.quantity,
      }))
    )

  if (insertError) return { ok: false, error: insertError.message }
  return { ok: true }
}
