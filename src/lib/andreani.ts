/**
 * Cliente Andreani — fase actual: MOCK únicamente.
 *
 * ANDREANI_MODE=mock        → datos simulados (único modo implementado)
 * ANDREANI_MODE=qa          → bloqueado hasta confirmar credenciales y multibulto
 * ANDREANI_MODE=production  → bloqueado hasta confirmar credenciales y multibulto
 *
 * Pendiente de confirmar con Andreani antes de habilitar QA/producción:
 *   - Credenciales de acceso (usuario, contraseña, contrato)
 *   - Autenticación exacta API V2 (header x-authorization-token)
 *   - Soporte multibulto: una solicitud con bultos[] o N solicitudes independientes
 *   - Modelo de valor declarado para combos (1 variante → N cajas)
 */

import type { AndreaniDomicilioQuote, ShippingPackageProfile } from '@/types/shipping'

// ─── Config y errores ─────────────────────────────────────────────────────────

type AndreaniMode = 'mock' | 'qa' | 'production'

function getMode(): AndreaniMode {
  const mode = process.env.ANDREANI_MODE as AndreaniMode | undefined

  if (!mode) {
    if (process.env.NODE_ENV === 'production') {
      throw new AndreaniConfigError(
        'ANDREANI_MODE no está configurado en producción. ' +
        'Establecer ANDREANI_MODE=mock para desarrollo o configurar QA/producción.'
      )
    }
    // En dev: fallback a mock con advertencia
    console.warn('[ANDREANI] ANDREANI_MODE no seteado — usando mock por defecto en desarrollo')
    return 'mock'
  }

  if (!['mock', 'qa', 'production'].includes(mode)) {
    throw new AndreaniConfigError(`ANDREANI_MODE inválido: "${mode}". Valores válidos: mock | qa | production`)
  }

  return mode
}

export class AndreaniConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AndreaniConfigError'
  }
}

export class AndreaniUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AndreaniUnavailableError'
  }
}

// ─── Interfaz pública ─────────────────────────────────────────────────────────

export interface GetShippingQuoteParams {
  destinationCp: string
  packages: Pick<ShippingPackageProfile, 'weightG' | 'heightMm' | 'widthMm' | 'lengthMm'>[]
  declaredValueCentavos: number
  bypassCache?: boolean
}

/**
 * Cotiza el envío domicilio para un conjunto de bultos.
 * Los datos de paquete SIEMPRE vienen del servidor (resueltos desde DB).
 * Nunca aceptar weight/height/width/length del frontend.
 */
export async function getShippingQuote(
  params: GetShippingQuoteParams
): Promise<AndreaniDomicilioQuote> {
  const mode = getMode()

  if (mode === 'qa' || mode === 'production') {
    // ⚠️ Bloqueado hasta confirmar:
    //    - credenciales API V2
    //    - soporte multibulto (una solicitud vs N solicitudes)
    //    - modelo valor declarado para combos
    throw new AndreaniConfigError(
      `ANDREANI_MODE="${mode}" no está implementado. ` +
      'La integración real queda pendiente de confirmar credenciales, ' +
      'autenticación y comportamiento multibulto con Andreani.'
    )
  }

  return getMockQuote(params)
}

/**
 * Clave de caché para una cotización.
 * Incluye todos los factores que pueden cambiar el precio.
 */
export function buildCacheKey(params: GetShippingQuoteParams): string {
  const originCp = process.env.ANDREANI_ORIGIN_CP ?? 'unknown'
  const contract = process.env.ANDREANI_CONTRACT_NUMBER ?? 'mock'
  const mode = process.env.ANDREANI_MODE ?? 'mock'

  // Normalizar y ordenar paquetes para clave estable
  const normalizedPackages = [...params.packages]
    .sort((a, b) => {
      const keyA = `${a.weightG}-${a.heightMm}-${a.widthMm}-${a.lengthMm}`
      const keyB = `${b.weightG}-${b.heightMm}-${b.widthMm}-${b.lengthMm}`
      return keyA.localeCompare(keyB)
    })
    .map((p) => `${p.weightG}g-${p.heightMm}x${p.widthMm}x${p.lengthMm}`)
    .join(',')

  return [
    'andreani',
    mode,
    contract,
    originCp,
    params.destinationCp,
    'domicilio',
    params.declaredValueCentavos,
    normalizedPackages,
  ].join(':')
}

// ─── Mock ─────────────────────────────────────────────────────────────────────

function getMockQuote(params: GetShippingQuoteParams): AndreaniDomicilioQuote {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[ANDREANI MOCK] getShippingQuote llamado', {
      cp: params.destinationCp,
      bultos: params.packages.length,
    })
  }

  const cpNum = parseInt(params.destinationCp, 10) || 1000
  const distanceFactor = Math.min((cpNum % 9000) / 9000, 1)

  // Precio base por distancia (primer bulto)
  const basePriceCentavos = 480000 + Math.round(distanceFactor * 270000) // $4.800–$7.500

  // Cada bulto adicional al 80% del anterior (decremento por volumen simulado)
  let totalPrice = 0
  for (let i = 0; i < params.packages.length; i++) {
    totalPrice += Math.round(basePriceCentavos * Math.pow(0.8, i))
  }

  return {
    price: totalPrice,
    estimatedDays: '3–7 días hábiles',
    quotedAt: new Date().toISOString(),
  }
}
