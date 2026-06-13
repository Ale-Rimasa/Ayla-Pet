/**
 * Cliente oficial MiCorreo v1 (Correo Argentino) — solo cotización.
 *
 * Variables de entorno requeridas (modo official):
 *   MICORREO_API_USER          → usuario de la cuenta MiCorreo (Basic Auth para /token)
 *   MICORREO_API_PASSWORD      → contraseña de la cuenta MiCorreo (Basic Auth para /token)
 *   MICORREO_BASE_URL          → URL base de la API
 *                                   TEST: https://apitest.correoargentino.com.ar/micorreo/v1
 *                                   PROD: https://api.correoargentino.com.ar/micorreo/v1
 *   CORREO_ARGENTINO_CUSTOMER_ID → customerId de la cuenta (ver bootstrap manual abajo)
 *   CORREO_ARGENTINO_ORIGIN_CP   → código postal de origen (ya usado por otros modos)
 *
 * ─── Bootstrap manual de CORREO_ARGENTINO_CUSTOMER_ID (una sola vez) ───────────
 *
 * MiCorreo no expone el customerId directamente vía login. Para obtenerlo:
 *
 * 1. Pedir un token (Basic Auth con MICORREO_API_USER:MICORREO_API_PASSWORD):
 *
 *    curl -X POST "https://apitest.correoargentino.com.ar/micorreo/v1/token" \
 *      -u "MICORREO_API_USER:MICORREO_API_PASSWORD"
 *
 *    → responde { "token": "...", "expires": "..." }
 *
 * 2. Validar el usuario con el token (Bearer) para obtener el customerId:
 *
 *    curl -X GET "https://apitest.correoargentino.com.ar/micorreo/v1/users/validate" \
 *      -H "Authorization: Bearer <token>"
 *
 *    → responde un objeto con el `customerId` de la cuenta.
 *
 * 3. Copiar ese `customerId` a la variable de entorno CORREO_ARGENTINO_CUSTOMER_ID.
 *
 * `/users/validate` NUNCA se llama desde el código de la aplicación en runtime —
 * es exclusivamente para este bootstrap manual, una sola vez por cuenta/ambiente.
 */

import { z } from 'zod'
import {
  CorreoArgentinoConfigError,
  CorreoArgentinoApiError,
  type GetCorreoArgentinoQuoteParams,
  type CorreoArgentinoQuote,
  type DeliveryRates,
} from '@/lib/correo-argentino'

// ─── Errores ──────────────────────────────────────────────────────────────────

/**
 * Errores compartidos con el adaptador (`correo-argentino.ts`):
 *  - `CorreoArgentinoConfigError`: variables de entorno faltantes o inválidas,
 *    lanzado ANTES de cualquier llamada de red.
 *  - `CorreoArgentinoApiError`: respuestas no-2xx, parseo inválido, timeout,
 *    límites excedidos o datos faltantes en la respuesta.
 *
 * Re-exportados con los nombres `CorreoArgentinoOfficial*` para mantener
 * compatibilidad con los tests existentes de este módulo — son la MISMA clase,
 * `instanceof` funciona indistintamente del nombre usado para importar.
 */
export {
  CorreoArgentinoConfigError as CorreoArgentinoOfficialConfigError,
  CorreoArgentinoApiError as CorreoArgentinoOfficialApiError,
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const TEST_BASE_URL = 'https://apitest.correoargentino.com.ar/micorreo/v1'

const TOKEN_TTL_MS = 60 * 60 * 1000 // 60 minutos (TTL fijo conservador, ver design)
const FETCH_TIMEOUT_MS = 8_000
const MAX_ATTEMPTS = 2
const RETRY_DELAY_MS = 300

const MAX_WEIGHT_G = 25_000
const MAX_DIMENSION_CM = 150

// ─── Guards de config ─────────────────────────────────────────────────────────

function getRequiredEnv(key: string): string {
  const val = process.env[key]
  if (!val) {
    throw new CorreoArgentinoConfigError(
      `${key} no está configurado. Requerido para CORREO_ARGENTINO_MODE=official.`
    )
  }
  return val
}

/**
 * Resuelve la URL base de la API MiCorreo.
 * En producción es obligatoria (evita cotizar contra TEST sin querer).
 * En dev/test, si no está seteada, usa la URL de TEST con un warning.
 */
function getBaseUrl(): string {
  const baseUrl = process.env.MICORREO_BASE_URL

  if (!baseUrl) {
    if (process.env.NODE_ENV === 'production') {
      throw new CorreoArgentinoConfigError(
        'MICORREO_BASE_URL no está configurado en producción. ' +
        'Establecer la URL de producción de MiCorreo.'
      )
    }
    console.warn('[MICORREO] MICORREO_BASE_URL no seteado — usando URL de TEST por defecto')
    return TEST_BASE_URL
  }

  return baseUrl
}

interface OfficialConfig {
  apiUser: string
  apiPassword: string
  baseUrl: string
  customerId: string
  originCp: string
}

function getConfig(): OfficialConfig {
  const apiUser = getRequiredEnv('MICORREO_API_USER')
  const apiPassword = getRequiredEnv('MICORREO_API_PASSWORD')
  const baseUrl = getBaseUrl()
  const customerId = getRequiredEnv('CORREO_ARGENTINO_CUSTOMER_ID')
  const originCp = getRequiredEnv('CORREO_ARGENTINO_ORIGIN_CP')

  return { apiUser, apiPassword, baseUrl, customerId, originCp }
}

// ─── Zod schemas ──────────────────────────────────────────────────────────────

// Schema laxo: solo se valida el campo `token`, usado por el cliente.
const tokenResponseSchema = z.object({
  token: z.string().min(1),
}).passthrough()

const rateEntrySchema = z.object({
  deliveredType: z.string(),
  productType: z.string().optional(),
  productName: z.string().optional(),
  price: z.number(),
  deliveryTimeMin: z.string().optional(),
  deliveryTimeMax: z.string().optional(),
}).passthrough()

const ratesResponseSchema = z.object({
  rates: z.array(rateEntrySchema),
}).passthrough()

// ─── Token cache ──────────────────────────────────────────────────────────────

let tokenCache: { token: string; fetchedAt: number } | null = null

function isTokenValid(): boolean {
  if (!tokenCache) return false
  return Date.now() - tokenCache.fetchedAt < TOKEN_TTL_MS
}

/**
 * Obtiene un token válido. Usa el cacheado si todavía no expiró (TTL fijo,
 * no se parsea el campo `expires` — ver decisión de diseño), o pide uno nuevo
 * vía POST /token con Basic Auth.
 *
 * `force` ignora la caché y siempre pide un token nuevo (usado en re-auth tras 401).
 */
async function ensureToken(config: OfficialConfig, force = false): Promise<string> {
  if (!force && isTokenValid()) {
    return tokenCache!.token
  }

  const basicAuth = Buffer.from(`${config.apiUser}:${config.apiPassword}`).toString('base64')

  const response = await fetchWithRetry(`${config.baseUrl}/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
    },
  })

  if (!response.ok) {
    const errorBody = await safeReadJson(response)
    throw new CorreoArgentinoApiError(
      buildApiErrorMessage('No se pudo obtener token de MiCorreo', response.status, errorBody),
      { status: response.status, code: extractErrorCode(errorBody) }
    )
  }

  const json = await response.json()
  const parsed = tokenResponseSchema.safeParse(json)
  if (!parsed.success) {
    throw new CorreoArgentinoApiError('Respuesta inválida de POST /token (schema)')
  }

  tokenCache = { token: parsed.data.token, fetchedAt: Date.now() }
  return tokenCache.token
}

// ─── Helpers de fetch, retry y timeout ────────────────────────────────────────

function safeReadJson(response: Response): Promise<unknown> {
  return response.json().catch(() => undefined)
}

function extractErrorCode(body: unknown): string | undefined {
  if (body && typeof body === 'object' && 'code' in body) {
    const code = (body as { code?: unknown }).code
    return typeof code === 'string' ? code : undefined
  }
  return undefined
}

function buildApiErrorMessage(prefix: string, status: number, body: unknown): string {
  const message =
    body && typeof body === 'object' && 'message' in body && typeof (body as { message?: unknown }).message === 'string'
      ? (body as { message: string }).message
      : undefined

  return message ? `${prefix}: ${status} ${message}` : `${prefix}: ${status}`
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Ejecuta `fetch` con:
 *  - timeout de 8s vía AbortSignal.timeout
 *  - reintento acotado (máx 2 intentos) SOLO ante 429, con backoff de 300ms
 *  - 400/401/402/404/409 se devuelven tal cual (sin reintento de red) para que
 *    el caller decida — el manejo de 401 (re-auth en /rates) es responsabilidad
 *    del caller, este helper no lo reintenta
 */
async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let lastResponse: Response | undefined

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let response: Response
    try {
      response = await fetch(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    } catch (err) {
      if (err instanceof Error && err.name === 'TimeoutError') {
        throw new CorreoArgentinoApiError('Timeout al contactar MiCorreo', { code: 'timeout' })
      }
      throw err
    }

    if (response.status === 429 && attempt < MAX_ATTEMPTS) {
      lastResponse = response
      await delay(RETRY_DELAY_MS)
      continue
    }

    return response
  }

  // Se agotaron los reintentos por 429
  return lastResponse!
}

// ─── Mapeo de request /rates ──────────────────────────────────────────────────

function resolveLargestPackage(
  packages: GetCorreoArgentinoQuoteParams['packages']
): GetCorreoArgentinoQuoteParams['packages'][number] {
  return packages.reduce((max, pkg) => {
    const volMax = max.heightMm * max.widthMm * max.lengthMm
    const volPkg = pkg.heightMm * pkg.widthMm * pkg.lengthMm
    return volPkg > volMax ? pkg : max
  })
}

function mmToCmCeil(mm: number): number {
  return Math.ceil(mm / 10)
}

interface RatesRequestBody {
  customerId: string
  postalCodeOrigin: string
  postalCodeDestination: string
  dimensions: {
    weight: number
    height: number
    width: number
    length: number
  }
}

function buildRatesRequest(
  config: OfficialConfig,
  params: GetCorreoArgentinoQuoteParams
): RatesRequestBody {
  const { packages, destinationCp } = params

  const totalWeightG = packages.reduce((sum, p) => sum + p.weightG, 0)
  const largest = resolveLargestPackage(packages)

  const heightCm = mmToCmCeil(largest.heightMm)
  const widthCm = mmToCmCeil(largest.widthMm)
  const lengthCm = mmToCmCeil(largest.lengthMm)

  if (totalWeightG > MAX_WEIGHT_G) {
    throw new CorreoArgentinoApiError(
      `El peso consolidado (${totalWeightG}g) supera el máximo permitido (${MAX_WEIGHT_G}g)`,
      { code: 'limit_exceeded' }
    )
  }

  for (const [name, value] of [['height', heightCm], ['width', widthCm], ['length', lengthCm]] as const) {
    if (value > MAX_DIMENSION_CM) {
      throw new CorreoArgentinoApiError(
        `La dimensión ${name} consolidada (${value}cm) supera el máximo permitido (${MAX_DIMENSION_CM}cm)`,
        { code: 'limit_exceeded' }
      )
    }
  }

  return {
    customerId: config.customerId,
    postalCodeOrigin: config.originCp,
    postalCodeDestination: destinationCp,
    dimensions: {
      weight: totalWeightG,
      height: heightCm,
      width: widthCm,
      length: lengthCm,
    },
  }
}

// ─── Llamada a /rates (con re-auth en 401 y retry en 429) ─────────────────────

async function fetchRates(config: OfficialConfig, body: RatesRequestBody): Promise<unknown> {
  let token = await ensureToken(config)

  let response = await fetchWithRetry(`${config.baseUrl}/rates`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (response.status === 401) {
    // Re-autenticar y reintentar exactamente una vez
    token = await ensureToken(config, true)
    response = await fetchWithRetry(`${config.baseUrl}/rates`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (response.status === 401) {
      const errorBody = await safeReadJson(response)
      throw new CorreoArgentinoApiError(
        buildApiErrorMessage('No autorizado en /rates tras reintento', 401, errorBody),
        { status: 401, code: extractErrorCode(errorBody) }
      )
    }
  }

  if (!response.ok) {
    const errorBody = await safeReadJson(response)

    if (response.status === 429) {
      throw new CorreoArgentinoApiError(
        buildApiErrorMessage('MiCorreo /rates rate-limited (429)', 429, errorBody),
        { status: 429, code: 'rate_limited' }
      )
    }

    throw new CorreoArgentinoApiError(
      buildApiErrorMessage('Error de MiCorreo /rates', response.status, errorBody),
      { status: response.status, code: extractErrorCode(errorBody) }
    )
  }

  return response.json()
}

// ─── Mapeo de response /rates ─────────────────────────────────────────────────

function pesosToCentavos(pesos: number): number {
  return Math.round(pesos * 100)
}

// Mapa productType (MiCorreo) → velocidad (dominio interno). 'CP' = Paquete
// Clásico, 'EP' = Paquete Expreso. Cualquier otro valor (vacío, desconocido)
// se ignora — ver mapRatesResponse.
const PRODUCT_TYPE_MAP: Record<string, 'clasico' | 'expreso'> = {
  CP: 'clasico',
  EP: 'expreso',
}

function mapRatesResponse(json: unknown): CorreoArgentinoQuote {
  const parsed = ratesResponseSchema.safeParse(json)
  if (!parsed.success) {
    throw new CorreoArgentinoApiError('Respuesta inválida de POST /rates (schema)')
  }

  const { rates } = parsed.data

  const matriz: { domicilio: DeliveryRates; sucursal: DeliveryRates } = {
    domicilio: { clasico: null, expreso: null },
    sucursal: { clasico: null, expreso: null },
  }

  for (const rate of rates) {
    let grupo: 'domicilio' | 'sucursal'
    if (rate.deliveredType === 'D') {
      grupo = 'domicilio'
    } else if (rate.deliveredType === 'S') {
      grupo = 'sucursal'
    } else {
      console.warn(`[MICORREO] deliveredType desconocido: "${rate.deliveredType}" — entrada ignorada`)
      continue
    }

    const velocidad = rate.productType ? PRODUCT_TYPE_MAP[rate.productType] : undefined
    if (!velocidad) {
      console.warn(`[MICORREO] productType desconocido: "${rate.productType ?? ''}" — entrada ignorada`)
      continue
    }

    if (matriz[grupo][velocidad] !== null) {
      console.warn(
        `[MICORREO] /rates devolvió más de una entrada para deliveredType=${rate.deliveredType} productType=${rate.productType} — se conserva la primera`
      )
      continue
    }

    matriz[grupo][velocidad] = {
      priceCentavos: pesosToCentavos(rate.price),
      diasMin: rate.deliveryTimeMin,
      diasMax: rate.deliveryTimeMax,
    }
  }

  return {
    ...matriz,
    rateSource: 'official',
    quotedAt: new Date().toISOString(),
  }
}

// ─── Interfaz pública ─────────────────────────────────────────────────────────

export async function getQuoteFromOfficial(
  params: GetCorreoArgentinoQuoteParams
): Promise<CorreoArgentinoQuote> {
  const config = getConfig()

  const requestBody = buildRatesRequest(config, params)
  const json = await fetchRates(config, requestBody)

  return mapRatesResponse(json)
}
