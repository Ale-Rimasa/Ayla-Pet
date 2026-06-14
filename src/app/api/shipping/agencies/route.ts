import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  arToMicorreoProvinceCode,
  filterAgenciesByPostalCode,
  CorreoArgentinoApiError,
} from '@/lib/correo-argentino'
import { getAgencies } from '@/lib/correo-argentino-official'
import { checkRateLimit } from '@/lib/rate-limit'

// CP argentino: 4–8 dígitos
const CP_REGEX = /^\d{4,8}$/

const querySchema = z.object({
  provincia: z.string().regex(/^AR-[A-Z]+$/, 'Provincia inválida (formato: AR-X)'),
  cp: z.string().regex(CP_REGEX, 'Código postal inválido (4–8 dígitos)'),
})

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!await checkRateLimit(`agencies:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const params = Object.fromEntries(new URL(request.url).searchParams)
  const parsed = querySchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { provincia, cp } = parsed.data

  const provinceCode = arToMicorreoProvinceCode(provincia)
  if (!provinceCode) {
    return NextResponse.json({ error: 'invalid_province' }, { status: 400 })
  }

  // Igual que /api/shipping/quote: si no estamos en modo official, degradar
  // suavemente — el selector de checkout muestra "no disponible".
  const correoMode = process.env.CORREO_ARGENTINO_MODE ?? 'mock'
  if (correoMode !== 'official') {
    return NextResponse.json(
      { agencies: [] },
      { headers: { 'Cache-Control': 'private, max-age=300' } }
    )
  }

  try {
    const agencies = await getAgencies({ provinceCode })
    const filtered = filterAgenciesByPostalCode(agencies, cp)

    return NextResponse.json(
      { agencies: filtered },
      { headers: { 'Cache-Control': 'private, max-age=300' } }
    )
  } catch (err) {
    const message = err instanceof CorreoArgentinoApiError ? err.message : 'Error desconocido'
    console.error('[api/shipping/agencies]', message)
    return NextResponse.json({ error: 'agencies_unavailable' }, { status: 502 })
  }
}
