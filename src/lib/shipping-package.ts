import { getPackageProfilesForVariants } from '@/lib/db/shipping'
import type { ResolvedPackages, ShippingPackageProfile, ShippingPackageSnapshot } from '@/types/shipping'

export interface CartItemInput {
  variantId: string
  quantity: number
}

/**
 * Resuelve los bultos independientes para un carrito.
 *
 * Regla: cada unidad de cada variante genera sus propios paquetes
 * según variant_shipping_packages. No hay agrupación entre productos.
 *
 * Ejemplos:
 *   1 mate          → [mate_box]
 *   2 mates         → [mate_box, mate_box]
 *   1 mate + 1 chapita → [mate_box, small_accessory_box]
 *   combo 2 mates   → [mate_box, mate_box]  (variant_shipping_packages.quantity=2)
 */
export async function resolveShippingPackages(
  items: CartItemInput[]
): Promise<ResolvedPackages> {
  if (items.length === 0) {
    return { ok: false, reason: 'missing_profiles' }
  }

  const variantIds = [...new Set(items.map((i) => i.variantId))]
  const profilesByVariant = await getPackageProfilesForVariants(variantIds)

  const packages: ShippingPackageProfile[] = []

  for (const item of items) {
    const assignments = profilesByVariant.get(item.variantId) ?? []

    if (assignments.length === 0) {
      return { ok: false, reason: 'missing_profiles' }
    }

    for (const assignment of assignments) {
      const { profile, quantity: boxesPerUnit } = assignment

      if (!profile.isActive) {
        return { ok: false, reason: 'profile_not_active' }
      }

      if (!profile.weightG || !profile.heightMm || !profile.widthMm || !profile.lengthMm) {
        return { ok: false, reason: 'profile_incomplete' }
      }

      // Cada unidad del item genera boxesPerUnit cajas
      const totalBoxes = item.quantity * boxesPerUnit
      for (let i = 0; i < totalBoxes; i++) {
        packages.push(profile)
      }
    }
  }

  return { ok: true, packages }
}

/**
 * Convierte los paquetes resueltos en snapshots para persistir en la orden.
 * El bulto_index arranca en 1.
 */
export function packagesToSnapshots(
  packages: ShippingPackageProfile[]
): ShippingPackageSnapshot[] {
  return packages.map((pkg, i) => ({
    packageProfileId: pkg.id,
    bultoIndex: i + 1,
    weightG: pkg.weightG,
    heightMm: pkg.heightMm,
    widthMm: pkg.widthMm,
    lengthMm: pkg.lengthMm,
  }))
}
