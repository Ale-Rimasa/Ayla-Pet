/**
 * Cliente Correo Argentino — adaptador intercambiable por modo.
 *
 * CORREO_ARGENTINO_MODE=mock      → datos simulados (desarrollo sin clave)
 * CORREO_ARGENTINO_MODE=official  → API oficial MiCorreo v1 (ver correo-argentino-official.ts)
 */

import type { ShippingPackageProfile } from '@/types/shipping'

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export type CorreoArgentinoMode = 'mock' | 'official'

export interface GetCorreoArgentinoQuoteParams {
  destinationCp: string
  destinationProvincia: string
  packages: Pick<ShippingPackageProfile, 'weightG' | 'heightMm' | 'widthMm' | 'lengthMm'>[]
}

export interface RateOption {
  priceCentavos: number
  diasMin?: string
  diasMax?: string
}

export interface DeliveryRates {
  clasico: RateOption | null
  expreso: RateOption | null
}

export interface CorreoArgentinoQuote {
  domicilio: DeliveryRates
  sucursal: DeliveryRates
  rateSource: 'official' | 'mock'
  quotedAt: string
}

/**
 * Sucursal de Correo Argentino (MiCorreo). Lo que se MUESTRA en el selector de
 * checkout y lo que se PERSISTE como `shipping_agency_snapshot` son el MISMO
 * objeto — no hay un tipo separado de snapshot (decisión de diseño, Fase 2).
 */
export interface Agency {
  code: string
  name: string
  address: string
  locality?: string
  city?: string
  province?: string
  postalCode?: string
  phone?: string
  services?: {
    packageReception?: boolean
    pickupAvailability?: boolean
  }
  hours?: {
    day?: string
    hourFrom?: string
    hourTo?: string
  }[]
}

// ─── Errores ──────────────────────────────────────────────────────────────────

export class CorreoArgentinoConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CorreoArgentinoConfigError'
  }
}

/**
 * Error de la API MiCorreo: respuestas no-2xx, parseo inválido, timeout,
 * límites excedidos o datos faltantes en la respuesta.
 */
export class CorreoArgentinoApiError extends Error {
  status?: number
  code?: string

  constructor(message: string, options?: { status?: number; code?: string }) {
    super(message)
    this.name = 'CorreoArgentinoApiError'
    this.status = options?.status
    this.code = options?.code
  }
}

// ─── Config ───────────────────────────────────────────────────────────────────

function getMode(): CorreoArgentinoMode {
  const mode = process.env.CORREO_ARGENTINO_MODE as CorreoArgentinoMode | undefined

  if (!mode) {
    if (process.env.NODE_ENV === 'production') {
      throw new CorreoArgentinoConfigError(
        'CORREO_ARGENTINO_MODE no está configurado en producción. ' +
        'Establecer CORREO_ARGENTINO_MODE=mock o official.'
      )
    }
    return 'mock'
  }

  if (!['mock', 'official'].includes(mode)) {
    throw new CorreoArgentinoConfigError(
      `CORREO_ARGENTINO_MODE inválido: "${mode}". Valores válidos: mock | official`
    )
  }

  return mode
}

// ─── Interfaz pública ─────────────────────────────────────────────────────────

export async function getCorreoArgentinoQuote(
  params: GetCorreoArgentinoQuoteParams
): Promise<CorreoArgentinoQuote> {
  const mode = getMode()

  if (mode === 'official') {
    const { getQuoteFromOfficial } = await import('@/lib/correo-argentino-official')
    return getQuoteFromOfficial(params)
  }

  return getMockQuote()
}

// ─── Mapeo de provincia AR-X → código MiCorreo (1 letra) ──────────────────────

/**
 * AR-X (ISO 3166-2:AR, usado en checkout) → provinceCode de MiCorreo (1 letra).
 *
 * MiCorreo usa la MISMA letra que el sufijo ISO para las 24 jurisdicciones,
 * pero se define explícito (no derivado de `AR_PROVINCES`) para no acoplarse
 * a esa coincidencia — si MiCorreo cambia algún código, se ajusta solo acá.
 */
export const AR_PROVINCE_TO_MICORREO: Record<string, string> = {
  'AR-B': 'B', // Buenos Aires
  'AR-C': 'C', // Ciudad Autónoma de Buenos Aires
  'AR-K': 'K', // Catamarca
  'AR-H': 'H', // Chaco
  'AR-U': 'U', // Chubut
  'AR-X': 'X', // Córdoba
  'AR-W': 'W', // Corrientes
  'AR-E': 'E', // Entre Ríos
  'AR-P': 'P', // Formosa
  'AR-Y': 'Y', // Jujuy
  'AR-L': 'L', // La Pampa
  'AR-F': 'F', // La Rioja
  'AR-M': 'M', // Mendoza
  'AR-N': 'N', // Misiones
  'AR-Q': 'Q', // Neuquén
  'AR-R': 'R', // Río Negro
  'AR-A': 'A', // Salta
  'AR-J': 'J', // San Juan
  'AR-D': 'D', // San Luis
  'AR-Z': 'Z', // Santa Cruz
  'AR-S': 'S', // Santa Fe
  'AR-G': 'G', // Santiago del Estero
  'AR-V': 'V', // Tierra del Fuego
  'AR-T': 'T', // Tucumán
}

/**
 * Mapea un código de provincia de checkout (`AR-X`) al código MiCorreo de
 * 1 letra. Devuelve `null` si la provincia no es reconocida — el caller (route)
 * debe responder 400 sin llamar a MiCorreo.
 */
export function arToMicorreoProvinceCode(arCode: string): string | null {
  return AR_PROVINCE_TO_MICORREO[arCode] ?? null
}

// ─── Filtrado de agencias por código postal ───────────────────────────────────

/**
 * Filtra agencias por código postal del destinatario:
 *  1. Match exacto (`postalCode === cp`).
 *  2. Si no hay match exacto, fallback a prefijo de 2 dígitos
 *     (`postalCode?.startsWith(cp.slice(0, 2))`).
 *  3. Si tampoco hay match por prefijo, devuelve TODAS las agencias recibidas
 *     (la provincia completa) — sin orden geográfico (out-of-scope).
 *
 * Función pura, sin I/O — corre server-side sobre el array de `getAgencies`.
 */
function extractFourDigitCp(value: string | undefined | null): string | undefined {
  return value?.match(/\d{4}/)?.[0]
}

export function filterAgenciesByPostalCode(agencies: Agency[], cp: string): Agency[] {
  // Las agencias devuelven el CP en formato CPA (ej. "B1650BFG"); el cliente
  // ingresa el CP clásico de 4 dígitos. Normalizamos ambos al núcleo numérico.
  const target = extractFourDigitCp(cp)
  if (!target) return agencies

  const exact = agencies.filter((a) => extractFourDigitCp(a.postalCode) === target)
  if (exact.length > 0) return exact

  const prefix = target.slice(0, 2)
  const byPrefix = agencies.filter((a) => extractFourDigitCp(a.postalCode)?.startsWith(prefix))
  if (byPrefix.length > 0) return byPrefix

  return agencies
}

// ─── Mock ─────────────────────────────────────────────────────────────────────

function getMockQuote(): CorreoArgentinoQuote {
  return {
    domicilio: {
      clasico: { priceCentavos: 950000, diasMin: '2', diasMax: '5' },
      expreso: { priceCentavos: 1300000, diasMin: '1', diasMax: '2' },
    },
    sucursal: {
      clasico: { priceCentavos: 700000, diasMin: '1', diasMax: '3' },
      expreso: null,
    },
    rateSource: 'mock',
    quotedAt: new Date().toISOString(),
  }
}
