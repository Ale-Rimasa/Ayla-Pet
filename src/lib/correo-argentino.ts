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
