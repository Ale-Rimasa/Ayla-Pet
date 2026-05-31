// ── Métodos de envío válidos ──────────────────────────────────────────────────
// pickup removido del scope hasta confirmar retiro presencial.

export const SHIPPING_METHODS = [
  'andreani-domicilio',
  'correo-argentino-domicilio',
  'correo-argentino-sucursal',
] as const
export type ShippingMethod = (typeof SHIPPING_METHODS)[number]

// ── Perfiles de paquete ───────────────────────────────────────────────────────

export interface ShippingPackageProfile {
  id: string
  label: string
  weightG: number     // gramos
  heightMm: number    // milímetros
  widthMm: number
  lengthMm: number
  isActive: boolean
}

// Resolución de paquetes para un carrito
export type ResolvedPackages =
  | { ok: true;  packages: ShippingPackageProfile[] }
  | { ok: false; reason: 'missing_profiles' | 'profile_not_active' | 'profile_incomplete' }

// ── Cotización Andreani ───────────────────────────────────────────────────────

export interface AndreaniDomicilioQuote {
  price: number         // centavos ARS, integer
  estimatedDays: string
  quotedAt: string      // ISO timestamp
}

// ── Snapshot de bulto (para order_shipping_packages) ─────────────────────────

export interface ShippingPackageSnapshot {
  packageProfileId: string
  bultoIndex: number
  weightG: number
  heightMm: number
  widthMm: number
  lengthMm: number
}
