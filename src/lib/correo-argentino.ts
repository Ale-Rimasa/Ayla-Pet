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

export interface CorreoArgentinoQuote {
  aSucursalCentavos: number
  aDomicilioCentavos: number
  rateSource: 'official' | 'mock'
  quotedAt: string
  aDomicilioDiasMin?: string
  aDomicilioDiasMax?: string
  aSucursalDiasMin?: string
  aSucursalDiasMax?: string
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
    aSucursalCentavos: 700000,
    aDomicilioCentavos: 950000,
    rateSource: 'mock',
    quotedAt: new Date().toISOString(),
  }
}
