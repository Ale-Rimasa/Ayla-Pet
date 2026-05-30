/**
 * Cliente Correo Argentino — adaptador intercambiable por modo.
 *
 * CORREO_ARGENTINO_MODE=mock      → datos simulados (desarrollo sin clave)
 * CORREO_ARGENTINO_MODE=rapidapi  → API RapidAPI brunoaramburu/correo-argentino1
 * CORREO_ARGENTINO_MODE=official  → bloqueado hasta recibir credenciales MiCorreo
 */

import type { ShippingPackageProfile } from '@/types/shipping'

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export type CorreoArgentinoMode = 'mock' | 'rapidapi' | 'official'

export interface GetCorreoArgentinoQuoteParams {
  destinationCp: string
  destinationProvincia: string
  packages: Pick<ShippingPackageProfile, 'weightG' | 'heightMm' | 'widthMm' | 'lengthMm'>[]
}

export interface CorreoArgentinoQuote {
  aSucursalCentavos: number
  aDomicilioCentavos: number
  rateSource: 'rapidapi' | 'official' | 'mock'
  quotedAt: string
}

// ─── Errores ──────────────────────────────────────────────────────────────────

export class CorreoArgentinoConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CorreoArgentinoConfigError'
  }
}

// ─── Config ───────────────────────────────────────────────────────────────────

function getMode(): CorreoArgentinoMode {
  const mode = process.env.CORREO_ARGENTINO_MODE as CorreoArgentinoMode | undefined

  if (!mode) {
    if (process.env.NODE_ENV === 'production') {
      throw new CorreoArgentinoConfigError(
        'CORREO_ARGENTINO_MODE no está configurado en producción. ' +
        'Establecer CORREO_ARGENTINO_MODE=mock o rapidapi.'
      )
    }
    return 'mock'
  }

  if (!['mock', 'rapidapi', 'official'].includes(mode)) {
    throw new CorreoArgentinoConfigError(
      `CORREO_ARGENTINO_MODE inválido: "${mode}". Valores válidos: mock | rapidapi | official`
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
    throw new CorreoArgentinoConfigError(
      'CORREO_ARGENTINO_MODE=official no está implementado. ' +
      'Pendiente de credenciales MiCorreo. Usar rapidapi o mock.'
    )
  }

  if (mode === 'rapidapi') {
    const { getQuoteFromRapidApi } = await import('@/lib/correo-argentino-rapidapi')
    return getQuoteFromRapidApi(params)
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
