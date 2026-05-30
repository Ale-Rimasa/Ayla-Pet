import { z } from 'zod'
import { CorreoArgentinoConfigError } from '@/lib/correo-argentino'
import type { GetCorreoArgentinoQuoteParams, CorreoArgentinoQuote } from '@/lib/correo-argentino'

const BASE_URL = 'https://correo-argentino1.p.rapidapi.com'
const RAPIDAPI_HOST = 'correo-argentino1.p.rapidapi.com'

// ─── Zod schemas para validar respuestas de la API ───────────────────────────

const pesoVolSchema = z.object({
  pesoVolumetricoCalculado: z.number().positive(),
})

const precioSchema = z.object({
  paqarClasico: z.object({
    aSucursal: z.number().int().positive(),
    aDomicilio: z.number().int().positive(),
  }),
})

// ─── Guards de config ─────────────────────────────────────────────────────────

function getRequiredEnv(key: string): string {
  const val = process.env[key]
  if (!val) {
    throw new CorreoArgentinoConfigError(
      `${key} no está configurado. Agregar al .env.local antes de usar el modo rapidapi.`
    )
  }
  return val
}

// ─── Helpers de conversión ────────────────────────────────────────────────────

function mmToCm(mm: number): number {
  return mm / 10
}

function gToKg(g: number): number {
  return g / 1000
}

function pesosTocentavos(pesos: number): number {
  return pesos * 100
}

// ─── API calls ────────────────────────────────────────────────────────────────

async function calcularPesoVol(
  key: string,
  largoCm: number,
  anchoCm: number,
  altoCm: number
): Promise<number> {
  const url = `${BASE_URL}/calcularPesoVol?largo=${largoCm}&ancho=${anchoCm}&alto=${altoCm}`
  const res = await fetch(url, {
    headers: {
      'x-rapidapi-host': RAPIDAPI_HOST,
      'x-rapidapi-key': key,
      'Content-Type': 'application/json',
    },
  })
  const json = await res.json()
  const parsed = pesoVolSchema.parse(json)
  return parsed.pesoVolumetricoCalculado
}

async function calcularPrecio(
  key: string,
  cpOrigen: string,
  cpDestino: string,
  provinciaOrigen: string,
  provinciaDestino: string,
  pesoKg: number
): Promise<{ aSucursal: number; aDomicilio: number }> {
  const url =
    `${BASE_URL}/calcularPrecio` +
    `?cpOrigen=${cpOrigen}` +
    `&cpDestino=${cpDestino}` +
    `&provinciaOrigen=${provinciaOrigen}` +
    `&provinciaDestino=${provinciaDestino}` +
    `&peso=${pesoKg}`
  const res = await fetch(url, {
    headers: {
      'x-rapidapi-host': RAPIDAPI_HOST,
      'x-rapidapi-key': key,
      'Content-Type': 'application/json',
    },
  })
  const json = await res.json()
  const parsed = precioSchema.parse(json)
  return parsed.paqarClasico
}

// ─── Resolución de peso efectivo multi-paquete ────────────────────────────────

function resolveLargestPackage(
  packages: GetCorreoArgentinoQuoteParams['packages']
): GetCorreoArgentinoQuoteParams['packages'][number] {
  return packages.reduce((max, pkg) => {
    const volMax = max.heightMm * max.widthMm * max.lengthMm
    const volPkg = pkg.heightMm * pkg.widthMm * pkg.lengthMm
    return volPkg > volMax ? pkg : max
  })
}

// ─── Interfaz pública ─────────────────────────────────────────────────────────

export async function getQuoteFromRapidApi(
  params: GetCorreoArgentinoQuoteParams
): Promise<CorreoArgentinoQuote> {
  const key            = getRequiredEnv('CORREO_ARGENTINO_RAPIDAPI_KEY')
  const originCp       = getRequiredEnv('CORREO_ARGENTINO_ORIGIN_CP')
  const originProvincia = getRequiredEnv('CORREO_ARGENTINO_ORIGIN_PROVINCIA')

  const { packages, destinationCp, destinationProvincia } = params

  // Peso real total en kg
  const totalWeightKg = gToKg(packages.reduce((sum, p) => sum + p.weightG, 0))

  // Peso volumétrico del paquete más grande (en cm)
  const largest = resolveLargestPackage(packages)
  const largoCm = mmToCm(largest.lengthMm)
  const anchoCm = mmToCm(largest.widthMm)
  const altoCm  = mmToCm(largest.heightMm)

  const pesoVolumetricoKg = await calcularPesoVol(key, largoCm, anchoCm, altoCm)

  // Peso efectivo = max(real, volumétrico)
  const pesoEfectivo = Math.max(totalWeightKg, pesoVolumetricoKg)

  const precio = await calcularPrecio(
    key,
    originCp,
    destinationCp,
    originProvincia,
    destinationProvincia,
    pesoEfectivo
  )

  return {
    aSucursalCentavos:  pesosTocentavos(precio.aSucursal),
    aDomicilioCentavos: pesosTocentavos(precio.aDomicilio),
    rateSource:         'rapidapi',
    quotedAt:           new Date().toISOString(),
  }
}
