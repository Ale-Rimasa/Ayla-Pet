import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── Fixtures ─────────────────────────────────────────────────────────────

const VALID_ENV = {
  MICORREO_API_USER: 'test-user',
  MICORREO_API_PASSWORD: 'test-password',
  MICORREO_BASE_URL: 'https://apitest.correoargentino.com.ar/micorreo/v1',
  CORREO_ARGENTINO_CUSTOMER_ID: 'cust-123',
  CORREO_ARGENTINO_ORIGIN_CP: '1414',
}

const SINGLE_PACKAGE = [
  { weightG: 500, heightMm: 150, widthMm: 200, lengthMm: 300 },
]

const BASE_PARAMS = {
  destinationCp: '2000',
  destinationProvincia: 'AR-S',
  packages: SINGLE_PACKAGE,
}

function withEnv(vars: Record<string, string | undefined>, fn: () => Promise<void>) {
  return async () => {
    const original: Record<string, string | undefined> = {}
    for (const [k, v] of Object.entries(vars)) {
      original[k] = process.env[k]
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
    try { await fn() }
    finally {
      for (const [k, v] of Object.entries(original)) {
        if (v === undefined) delete process.env[k]
        else process.env[k] = v
      }
    }
  }
}

// ─── Config guards ─────────────────────────────────────────────────────────

describe('getQuoteFromOfficial — config guards', () => {
  beforeEach(() => { vi.resetModules(); vi.restoreAllMocks() })

  it('lanza CorreoArgentinoOfficialConfigError si MICORREO_API_USER está ausente', withEnv(
    { ...VALID_ENV, MICORREO_API_USER: undefined },
    async () => {
      const { getQuoteFromOfficial, CorreoArgentinoOfficialConfigError } = await import('@/lib/correo-argentino-official')
      await expect(getQuoteFromOfficial(BASE_PARAMS)).rejects.toBeInstanceOf(CorreoArgentinoOfficialConfigError)
    }
  ))

  it('lanza CorreoArgentinoOfficialConfigError si MICORREO_API_PASSWORD está ausente', withEnv(
    { ...VALID_ENV, MICORREO_API_PASSWORD: undefined },
    async () => {
      const { getQuoteFromOfficial, CorreoArgentinoOfficialConfigError } = await import('@/lib/correo-argentino-official')
      await expect(getQuoteFromOfficial(BASE_PARAMS)).rejects.toBeInstanceOf(CorreoArgentinoOfficialConfigError)
    }
  ))

  it('lanza CorreoArgentinoOfficialConfigError si MICORREO_BASE_URL está ausente en producción', withEnv(
    { ...VALID_ENV, MICORREO_BASE_URL: undefined, NODE_ENV: 'production' },
    async () => {
      const { getQuoteFromOfficial, CorreoArgentinoOfficialConfigError } = await import('@/lib/correo-argentino-official')
      await expect(getQuoteFromOfficial(BASE_PARAMS)).rejects.toBeInstanceOf(CorreoArgentinoOfficialConfigError)
    }
  ))

  it('lanza CorreoArgentinoOfficialConfigError si CORREO_ARGENTINO_CUSTOMER_ID está ausente', withEnv(
    { ...VALID_ENV, CORREO_ARGENTINO_CUSTOMER_ID: undefined },
    async () => {
      const { getQuoteFromOfficial, CorreoArgentinoOfficialConfigError } = await import('@/lib/correo-argentino-official')
      await expect(getQuoteFromOfficial(BASE_PARAMS)).rejects.toBeInstanceOf(CorreoArgentinoOfficialConfigError)
    }
  ))

  it('lanza CorreoArgentinoOfficialConfigError si CORREO_ARGENTINO_ORIGIN_CP está ausente', withEnv(
    { ...VALID_ENV, CORREO_ARGENTINO_ORIGIN_CP: undefined },
    async () => {
      const { getQuoteFromOfficial, CorreoArgentinoOfficialConfigError } = await import('@/lib/correo-argentino-official')
      await expect(getQuoteFromOfficial(BASE_PARAMS)).rejects.toBeInstanceOf(CorreoArgentinoOfficialConfigError)
    }
  ))

  it('NO llama a fetch si falta una variable de entorno requerida', withEnv(
    { ...VALID_ENV, MICORREO_API_USER: undefined },
    async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch')
      const { getQuoteFromOfficial } = await import('@/lib/correo-argentino-official')
      await expect(getQuoteFromOfficial(BASE_PARAMS)).rejects.toThrow()
      expect(fetchSpy).not.toHaveBeenCalled()
    }
  ))
})

// ─── Token cache & auth ─────────────────────────────────────────────────────

const TOKEN_RESPONSE = { token: 'token-abc', expires: '2026-06-10 23:59:59' }

const RATES_RESPONSE_BOTH = {
  customerId: 'cust-123',
  validTo: '2026-06-11T00:00:00Z',
  rates: [
    {
      deliveredType: 'D',
      productType: 'CP',
      productName: 'Paquete Clásico',
      price: 100.5,
      deliveryTimeMin: '2',
      deliveryTimeMax: '5',
    },
    {
      deliveredType: 'S',
      productType: 'CP',
      productName: 'Paquete Clásico',
      price: 80.25,
      deliveryTimeMin: '1',
      deliveryTimeMax: '3',
    },
  ],
}

function jsonResponse(body: unknown, init?: { status?: number; ok?: boolean }) {
  const status = init?.status ?? 200
  const ok = init?.ok ?? (status >= 200 && status < 300)
  return {
    ok,
    status,
    json: async () => body,
  } as Response
}

function mockFetchSequence(responses: Array<{ url: RegExp; status?: number; ok?: boolean; body: unknown }>) {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = typeof input === 'string' ? input : input.toString()
    calls.push({ url, init })
    const match = responses.find((r) => r.url.test(url))
    if (!match) {
      throw new Error(`mockFetchSequence: no match for URL ${url}`)
    }
    return jsonResponse(match.body, { status: match.status, ok: match.ok })
  })
  return calls
}

describe('getQuoteFromOfficial — token cache & auth', () => {
  beforeEach(() => { vi.resetModules(); vi.restoreAllMocks() })

  it('la primera llamada hace POST /token con Basic Auth', withEnv(VALID_ENV, async () => {
    const calls = mockFetchSequence([
      { url: /\/token$/, body: TOKEN_RESPONSE },
      { url: /\/rates$/, body: RATES_RESPONSE_BOTH },
    ])

    const { getQuoteFromOfficial } = await import('@/lib/correo-argentino-official')
    await getQuoteFromOfficial(BASE_PARAMS)

    const tokenCall = calls.find((c) => /\/token$/.test(c.url))
    expect(tokenCall).toBeDefined()
    const headers = new Headers(tokenCall!.init?.headers)
    const authHeader = headers.get('Authorization') ?? ''
    expect(authHeader.startsWith('Basic ')).toBe(true)
    const decoded = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString('utf-8')
    expect(decoded).toBe(`${VALID_ENV.MICORREO_API_USER}:${VALID_ENV.MICORREO_API_PASSWORD}`)
  }))

  it('reutiliza el token cacheado en 2 llamadas consecutivas (1 sola llamada a /token)', withEnv(VALID_ENV, async () => {
    const calls = mockFetchSequence([
      { url: /\/token$/, body: TOKEN_RESPONSE },
      { url: /\/rates$/, body: RATES_RESPONSE_BOTH },
    ])

    const { getQuoteFromOfficial } = await import('@/lib/correo-argentino-official')
    await getQuoteFromOfficial(BASE_PARAMS)
    await getQuoteFromOfficial(BASE_PARAMS)

    const tokenCalls = calls.filter((c) => /\/token$/.test(c.url))
    expect(tokenCalls).toHaveLength(1)
  }))

  it('un 401 en /rates dispara re-autenticación y reintenta una vez', withEnv(VALID_ENV, async () => {
    let ratesCallCount = 0
    let tokenCallCount = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (/\/token$/.test(url)) {
        tokenCallCount++
        return jsonResponse({ token: `token-${tokenCallCount}`, expires: '2026-06-10 23:59:59' })
      }
      if (/\/rates$/.test(url)) {
        ratesCallCount++
        if (ratesCallCount === 1) {
          return jsonResponse({ code: '401', message: 'Unauthorized' }, { status: 401, ok: false })
        }
        return jsonResponse(RATES_RESPONSE_BOTH)
      }
      throw new Error(`unexpected URL ${url}`)
    })

    const { getQuoteFromOfficial } = await import('@/lib/correo-argentino-official')
    const result = await getQuoteFromOfficial(BASE_PARAMS)

    expect(tokenCallCount).toBe(2) // token inicial + re-auth
    expect(ratesCallCount).toBe(2) // primer 401 + retry exitoso
    expect(result.aDomicilioCentavos).toBeGreaterThan(0)
  }))

  it('un segundo 401 consecutivo en /rates lanza CorreoArgentinoOfficialApiError', withEnv(VALID_ENV, async () => {
    let tokenCallCount = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (/\/token$/.test(url)) {
        tokenCallCount++
        return jsonResponse({ token: `token-${tokenCallCount}`, expires: '2026-06-10 23:59:59' })
      }
      if (/\/rates$/.test(url)) {
        return jsonResponse({ code: '401', message: 'Unauthorized' }, { status: 401, ok: false })
      }
      throw new Error(`unexpected URL ${url}`)
    })

    const { getQuoteFromOfficial, CorreoArgentinoOfficialApiError } = await import('@/lib/correo-argentino-official')
    await expect(getQuoteFromOfficial(BASE_PARAMS)).rejects.toBeInstanceOf(CorreoArgentinoOfficialApiError)
  }))

  it('si POST /token devuelve 401, lanza error sin reintento y preserva el mensaje', withEnv(VALID_ENV, async () => {
    let tokenCallCount = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (/\/token$/.test(url)) {
        tokenCallCount++
        return jsonResponse({ code: '401', message: 'Credenciales inválidas' }, { status: 401, ok: false })
      }
      throw new Error(`unexpected URL ${url}`)
    })

    const { getQuoteFromOfficial, CorreoArgentinoOfficialApiError } = await import('@/lib/correo-argentino-official')
    await expect(getQuoteFromOfficial(BASE_PARAMS)).rejects.toMatchObject({
      message: expect.stringContaining('Credenciales inválidas'),
    })
    expect(tokenCallCount).toBe(1)
  }))
})

// ─── Mapeo de request /rates: dimensiones y consolidación multi-paquete ────

describe('getQuoteFromOfficial — mapeo de request /rates', () => {
  beforeEach(() => { vi.resetModules(); vi.restoreAllMocks() })

  it('un solo paquete: dimensiones en mm se convierten a cm con Math.ceil y el peso es weightG', withEnv(VALID_ENV, async () => {
    const calls = mockFetchSequence([
      { url: /\/token$/, body: TOKEN_RESPONSE },
      { url: /\/rates$/, body: RATES_RESPONSE_BOTH },
    ])

    // 155mm → ceil(15.5) = 16cm
    const params = {
      ...BASE_PARAMS,
      packages: [{ weightG: 500, heightMm: 155, widthMm: 155, lengthMm: 155 }],
    }

    const { getQuoteFromOfficial } = await import('@/lib/correo-argentino-official')
    await getQuoteFromOfficial(params)

    const ratesCall = calls.find((c) => /\/rates$/.test(c.url))
    expect(ratesCall).toBeDefined()
    const body = JSON.parse(ratesCall!.init?.body as string)
    expect(body.dimensions.height).toBe(16)
    expect(body.dimensions.width).toBe(16)
    expect(body.dimensions.length).toBe(16)
    expect(body.dimensions.weight).toBe(500)
  }))

  it('múltiples paquetes: el peso es la suma y las dimensiones son del paquete de mayor volumen', withEnv(VALID_ENV, async () => {
    const calls = mockFetchSequence([
      { url: /\/token$/, body: TOKEN_RESPONSE },
      { url: /\/rates$/, body: RATES_RESPONSE_BOTH },
    ])

    const params = {
      ...BASE_PARAMS,
      packages: [
        { weightG: 500, heightMm: 100, widthMm: 100, lengthMm: 100 }, // vol 1,000,000
        { weightG: 1200, heightMm: 200, widthMm: 200, lengthMm: 200 }, // vol 8,000,000 (mayor)
      ],
    }

    const { getQuoteFromOfficial } = await import('@/lib/correo-argentino-official')
    await getQuoteFromOfficial(params)

    const ratesCall = calls.find((c) => /\/rates$/.test(c.url))
    const body = JSON.parse(ratesCall!.init?.body as string)
    expect(body.dimensions.weight).toBe(1700)
    // 200mm → ceil(20) = 20cm (paquete más grande)
    expect(body.dimensions.height).toBe(20)
    expect(body.dimensions.width).toBe(20)
    expect(body.dimensions.length).toBe(20)
  }))

  it('omite deliveredType del body de /rates (pide ambos tipos)', withEnv(VALID_ENV, async () => {
    const calls = mockFetchSequence([
      { url: /\/token$/, body: TOKEN_RESPONSE },
      { url: /\/rates$/, body: RATES_RESPONSE_BOTH },
    ])

    const { getQuoteFromOfficial } = await import('@/lib/correo-argentino-official')
    await getQuoteFromOfficial(BASE_PARAMS)

    const ratesCall = calls.find((c) => /\/rates$/.test(c.url))
    const body = JSON.parse(ratesCall!.init?.body as string)
    expect(body).not.toHaveProperty('deliveredType')
    expect(body.customerId).toBe(VALID_ENV.CORREO_ARGENTINO_CUSTOMER_ID)
    expect(body.postalCodeOrigin).toBe(VALID_ENV.CORREO_ARGENTINO_ORIGIN_CP)
    expect(body.postalCodeDestination).toBe(BASE_PARAMS.destinationCp)
  }))

  it('peso consolidado > 25000g lanza error SIN llamar a /rates', withEnv(VALID_ENV, async () => {
    const calls = mockFetchSequence([
      { url: /\/token$/, body: TOKEN_RESPONSE },
      { url: /\/rates$/, body: RATES_RESPONSE_BOTH },
    ])

    const params = {
      ...BASE_PARAMS,
      packages: [{ weightG: 25_001, heightMm: 100, widthMm: 100, lengthMm: 100 }],
    }

    const { getQuoteFromOfficial, CorreoArgentinoOfficialApiError } = await import('@/lib/correo-argentino-official')
    await expect(getQuoteFromOfficial(params)).rejects.toBeInstanceOf(CorreoArgentinoOfficialApiError)

    const ratesCalls = calls.filter((c) => /\/rates$/.test(c.url))
    expect(ratesCalls).toHaveLength(0)
  }))

  it('una dimensión consolidada > 150cm (luego de ceil) lanza error SIN llamar a /rates', withEnv(VALID_ENV, async () => {
    const calls = mockFetchSequence([
      { url: /\/token$/, body: TOKEN_RESPONSE },
      { url: /\/rates$/, body: RATES_RESPONSE_BOTH },
    ])

    // 1501mm → ceil(150.1) = 151cm > 150
    const params = {
      ...BASE_PARAMS,
      packages: [{ weightG: 500, heightMm: 1501, widthMm: 100, lengthMm: 100 }],
    }

    const { getQuoteFromOfficial, CorreoArgentinoOfficialApiError } = await import('@/lib/correo-argentino-official')
    await expect(getQuoteFromOfficial(params)).rejects.toBeInstanceOf(CorreoArgentinoOfficialApiError)

    const ratesCalls = calls.filter((c) => /\/rates$/.test(c.url))
    expect(ratesCalls).toHaveLength(0)
  }))
})

// ─── Mapeo de response /rates ───────────────────────────────────────────────

describe('getQuoteFromOfficial — mapeo de response /rates', () => {
  beforeEach(() => { vi.resetModules(); vi.restoreAllMocks() })

  it('con D y S presentes, retorna ambos centavos como enteros positivos, rateSource y quotedAt', withEnv(VALID_ENV, async () => {
    mockFetchSequence([
      { url: /\/token$/, body: TOKEN_RESPONSE },
      { url: /\/rates$/, body: RATES_RESPONSE_BOTH },
    ])

    const { getQuoteFromOfficial } = await import('@/lib/correo-argentino-official')
    const result = await getQuoteFromOfficial(BASE_PARAMS)

    expect(Number.isInteger(result.aDomicilioCentavos)).toBe(true)
    expect(Number.isInteger(result.aSucursalCentavos)).toBe(true)
    expect(result.aDomicilioCentavos).toBeGreaterThan(0)
    expect(result.aSucursalCentavos).toBeGreaterThan(0)
    expect(result.rateSource).toBe('official')
    expect(result.quotedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  }))

  it('price 498.06 se convierte a 49806 centavos sin drift de punto flotante', withEnv(VALID_ENV, async () => {
    mockFetchSequence([
      { url: /\/token$/, body: TOKEN_RESPONSE },
      { url: /\/rates$/, body: {
        rates: [
          { deliveredType: 'D', price: 498.06, deliveryTimeMin: '2', deliveryTimeMax: '5' },
          { deliveredType: 'S', price: 100, deliveryTimeMin: '1', deliveryTimeMax: '3' },
        ],
      } },
    ])

    const { getQuoteFromOfficial } = await import('@/lib/correo-argentino-official')
    const result = await getQuoteFromOfficial(BASE_PARAMS)

    expect(result.aDomicilioCentavos).toBe(49806)
    expect(result.aSucursalCentavos).toBe(10000)
  }))

  it('si /rates devuelve solo un deliveredType, lanza error sin emitir 0/NaN', withEnv(VALID_ENV, async () => {
    mockFetchSequence([
      { url: /\/token$/, body: TOKEN_RESPONSE },
      { url: /\/rates$/, body: {
        rates: [
          { deliveredType: 'D', price: 100, deliveryTimeMin: '2', deliveryTimeMax: '5' },
        ],
      } },
    ])

    const { getQuoteFromOfficial, CorreoArgentinoOfficialApiError } = await import('@/lib/correo-argentino-official')
    await expect(getQuoteFromOfficial(BASE_PARAMS)).rejects.toBeInstanceOf(CorreoArgentinoOfficialApiError)
  }))

  it('incluye aDomicilioDiasMin/Max y aSucursalDiasMin/Max cuando vienen en la respuesta', withEnv(VALID_ENV, async () => {
    mockFetchSequence([
      { url: /\/token$/, body: TOKEN_RESPONSE },
      { url: /\/rates$/, body: RATES_RESPONSE_BOTH },
    ])

    const { getQuoteFromOfficial } = await import('@/lib/correo-argentino-official')
    const result = await getQuoteFromOfficial(BASE_PARAMS)

    expect(result.aDomicilioDiasMin).toBe('2')
    expect(result.aDomicilioDiasMax).toBe('5')
    expect(result.aSucursalDiasMin).toBe('1')
    expect(result.aSucursalDiasMax).toBe('3')
  }))

  it('si hay más de una entrada por deliveredType, toma la primera y emite console.warn', withEnv(VALID_ENV, async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    mockFetchSequence([
      { url: /\/token$/, body: TOKEN_RESPONSE },
      { url: /\/rates$/, body: {
        rates: [
          { deliveredType: 'D', price: 100, deliveryTimeMin: '2', deliveryTimeMax: '5' },
          { deliveredType: 'D', price: 200, deliveryTimeMin: '3', deliveryTimeMax: '6' },
          { deliveredType: 'S', price: 80, deliveryTimeMin: '1', deliveryTimeMax: '3' },
        ],
      } },
    ])

    const { getQuoteFromOfficial } = await import('@/lib/correo-argentino-official')
    const result = await getQuoteFromOfficial(BASE_PARAMS)

    expect(result.aDomicilioCentavos).toBe(10000) // primera entrada D (price: 100)
    expect(warnSpy).toHaveBeenCalled()
  }))
})

// ─── Retry, timeout y taxonomía de errores ──────────────────────────────────

describe('getQuoteFromOfficial — retry, timeout y errores', () => {
  beforeEach(() => { vi.resetModules(); vi.restoreAllMocks() })
  afterEach(() => { vi.useRealTimers() })

  it('429 una vez y luego 200 → espera backoff y retorna la cotización', withEnv(VALID_ENV, async () => {
    vi.useFakeTimers()

    let ratesCallCount = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (/\/token$/.test(url)) {
        return jsonResponse(TOKEN_RESPONSE)
      }
      if (/\/rates$/.test(url)) {
        ratesCallCount++
        if (ratesCallCount === 1) {
          return jsonResponse({ code: '429', message: 'Too Many Requests' }, { status: 429, ok: false })
        }
        return jsonResponse(RATES_RESPONSE_BOTH)
      }
      throw new Error(`unexpected URL ${url}`)
    })

    const { getQuoteFromOfficial } = await import('@/lib/correo-argentino-official')
    const promise = getQuoteFromOfficial(BASE_PARAMS)

    await vi.runAllTimersAsync()
    const result = await promise

    expect(ratesCallCount).toBe(2)
    expect(result.aDomicilioCentavos).toBeGreaterThan(0)
  }))

  it('429 en todos los intentos (2 totales) lanza CorreoArgentinoOfficialApiError de rate-limiting', withEnv(VALID_ENV, async () => {
    vi.useFakeTimers()

    let ratesCallCount = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (/\/token$/.test(url)) {
        return jsonResponse(TOKEN_RESPONSE)
      }
      if (/\/rates$/.test(url)) {
        ratesCallCount++
        return jsonResponse({ code: '429', message: 'Too Many Requests' }, { status: 429, ok: false })
      }
      throw new Error(`unexpected URL ${url}`)
    })

    const { getQuoteFromOfficial, CorreoArgentinoOfficialApiError } = await import('@/lib/correo-argentino-official')
    const promise = getQuoteFromOfficial(BASE_PARAMS)

    const assertion = expect(promise).rejects.toBeInstanceOf(CorreoArgentinoOfficialApiError)
    await vi.runAllTimersAsync()
    await assertion

    expect(ratesCallCount).toBe(2)
  }))

  it('402 "Cliente FAP no identificado" lanza inmediatamente sin reintento (1 fetch a /rates)', withEnv(VALID_ENV, async () => {
    let ratesCallCount = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (/\/token$/.test(url)) {
        return jsonResponse(TOKEN_RESPONSE)
      }
      if (/\/rates$/.test(url)) {
        ratesCallCount++
        return jsonResponse({ code: '402', message: 'Cliente FAP no identificado' }, { status: 402, ok: false })
      }
      throw new Error(`unexpected URL ${url}`)
    })

    const { getQuoteFromOfficial, CorreoArgentinoOfficialApiError } = await import('@/lib/correo-argentino-official')
    await expect(getQuoteFromOfficial(BASE_PARAMS)).rejects.toMatchObject({
      message: expect.stringContaining('Cliente FAP no identificado'),
    })
    expect(ratesCallCount).toBe(1)
  }))

  it.each([400, 404, 409])('un %i en /rates lanza inmediatamente sin reintento', async (status) => {
    await withEnv(VALID_ENV, async () => {
      let ratesCallCount = 0
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.toString()
        if (/\/token$/.test(url)) {
          return jsonResponse(TOKEN_RESPONSE)
        }
        if (/\/rates$/.test(url)) {
          ratesCallCount++
          return jsonResponse({ code: String(status), message: 'error' }, { status, ok: false })
        }
        throw new Error(`unexpected URL ${url}`)
      })

      const { getQuoteFromOfficial, CorreoArgentinoOfficialApiError } = await import('@/lib/correo-argentino-official')
      await expect(getQuoteFromOfficial(BASE_PARAMS)).rejects.toBeInstanceOf(CorreoArgentinoOfficialApiError)
      expect(ratesCallCount).toBe(1)
    })()
  })

  it('un shape zod inválido en /rates lanza CorreoArgentinoOfficialApiError', withEnv(VALID_ENV, async () => {
    mockFetchSequence([
      { url: /\/token$/, body: TOKEN_RESPONSE },
      { url: /\/rates$/, body: { unexpected: true } },
    ])

    const { getQuoteFromOfficial, CorreoArgentinoOfficialApiError } = await import('@/lib/correo-argentino-official')
    await expect(getQuoteFromOfficial(BASE_PARAMS)).rejects.toBeInstanceOf(CorreoArgentinoOfficialApiError)
  }))

  it('el flujo completo token+rates NO llama a /users/validate', withEnv(VALID_ENV, async () => {
    const calls = mockFetchSequence([
      { url: /\/token$/, body: TOKEN_RESPONSE },
      { url: /\/rates$/, body: RATES_RESPONSE_BOTH },
    ])

    const { getQuoteFromOfficial } = await import('@/lib/correo-argentino-official')
    await getQuoteFromOfficial(BASE_PARAMS)

    const validateCalls = calls.filter((c) => /\/users\/validate/.test(c.url))
    expect(validateCalls).toHaveLength(0)
  }))
})
