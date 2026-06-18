import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ShippingQuoteAccordion } from '@/components/product/ShippingQuoteAccordion'
import { formatPrice } from '@/lib/utils'

// El Select de Base UI necesita PointerEvents reales que jsdom no implementa
// (la interacción real se cubre con Playwright). Acá lo reemplazamos por un
// <select> nativo para poder testear la lógica del componente.
vi.mock('@/components/ui/select', async () => {
  const { AR_PROVINCES_LIST } = await import('@/lib/constants')
  return {
    Select: ({ value, onValueChange }: { value: string; onValueChange: (v: string) => void }) => (
      <select
        data-testid="provincia-select"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
      >
        <option value="">Seleccioná una provincia</option>
        {AR_PROVINCES_LIST.map(({ name, code }: { name: string; code: string }) => (
          <option key={code} value={code}>{name}</option>
        ))}
      </select>
    ),
    SelectTrigger: () => null,
    SelectContent: () => null,
    SelectItem: () => null,
  }
})

const VARIANT_ID = '123e4567-e89b-12d3-a456-426614174000'

// Normaliza espacios (incluido NBSP) para comparar con el texto renderizado por getByText
const normalizeSpaces = (s: string) => s.replace(/\s/g, ' ')

function openAccordion() {
  const trigger = screen.getByRole('button', { name: /medios de envío/i })
  fireEvent.click(trigger)
}

function fillCp(value: string) {
  const cpInput = screen.getByLabelText(/código postal/i)
  fireEvent.change(cpInput, { target: { value } })
}

function selectProvincia(code: string = 'AR-B') {
  const select = screen.getByTestId('provincia-select')
  fireEvent.change(select, { target: { value: code } })
}

function submitForm() {
  const submitButton = screen.getByRole('button', { name: /cotizar/i })
  fireEvent.click(submitButton)
}

beforeEach(() => {
  vi.unstubAllGlobals()
})

describe('ShippingQuoteAccordion', () => {
  it('renderiza el formulario de cotización cuando hay variantId', () => {
    render(<ShippingQuoteAccordion variantId={VARIANT_ID} />)
    openAccordion()

    expect(screen.getByLabelText(/código postal/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cotizar/i })).toBeInTheDocument()
  })

  it('no renderiza el formulario cuando variantId es null', () => {
    render(<ShippingQuoteAccordion variantId={null} />)
    openAccordion()

    expect(screen.queryByLabelText(/código postal/i)).not.toBeInTheDocument()
    expect(screen.getByText(/elegí una variante/i)).toBeInTheDocument()
  })

  it('valida el CP en el cliente y no llama a fetch si es inválido', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<ShippingQuoteAccordion variantId={VARIANT_ID} />)
    openAccordion()

    fillCp('12') // menos de 4 dígitos
    submitForm()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/código postal válido/i)
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('llama a fetch con el body correcto al cotizar', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        correoArgentino: {
          domicilio: {
            clasico: { priceCentavos: 620100, diasMin: '2', diasMax: '5' },
            expreso: null,
          },
          sucursal: {
            clasico: { priceCentavos: 368600, diasMin: '1', diasMax: '3' },
            expreso: null,
          },
          rateSource: 'official',
          quotedAt: new Date().toISOString(),
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<ShippingQuoteAccordion variantId={VARIANT_ID} />)
    openAccordion()

    fillCp('1425')
    selectProvincia('AR-B')
    submitForm()

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/shipping/quote')
    expect(options.method).toBe('POST')

    const body = JSON.parse(options.body)
    expect(body).toEqual({
      cp: '1425',
      provincia: 'AR-B',
      items: [{ variantId: VARIANT_ID, quantity: 1 }],
    })
  })

  it('con CP válido pero sin provincia, muestra error y NO llama a fetch', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<ShippingQuoteAccordion variantId={VARIANT_ID} />)
    openAccordion()

    fillCp('1425')
    submitForm()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/seleccioná una provincia/i)
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('muestra Clásico solo para domicilio con una respuesta 200 mockeada (sucursal deshabilitada)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        correoArgentino: {
          domicilio: {
            clasico: { priceCentavos: 620100, diasMin: '2', diasMax: '5' },
            expreso: null,
          },
          sucursal: {
            clasico: { priceCentavos: 368600, diasMin: '1', diasMax: '3' },
            expreso: null,
          },
          rateSource: 'official',
          quotedAt: new Date().toISOString(),
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<ShippingQuoteAccordion variantId={VARIANT_ID} />)
    openAccordion()

    fillCp('1425')
    selectProvincia('AR-B')
    submitForm()

    await waitFor(() => {
      expect(screen.getAllByText('Clásico').length).toBe(1)
    })

    expect(screen.getByText('A domicilio')).toBeInTheDocument()
    expect(screen.queryByText('A sucursal')).not.toBeInTheDocument()
    expect(screen.getByText('2–5 días hábiles')).toBeInTheDocument()
    expect(screen.getByText(normalizeSpaces(formatPrice(620100)))).toBeInTheDocument()
    expect(screen.queryByText(normalizeSpaces(formatPrice(368600)))).not.toBeInTheDocument()
    expect(screen.queryByText('Expreso')).not.toBeInTheDocument()
  })

  it('muestra Clásico y Expreso solo para domicilio cuando ambas velocidades están disponibles (sucursal deshabilitada)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        correoArgentino: {
          domicilio: {
            clasico: { priceCentavos: 620100, diasMin: '2', diasMax: '5' },
            expreso: { priceCentavos: 950000, diasMin: '1', diasMax: '2' },
          },
          sucursal: {
            clasico: { priceCentavos: 368600, diasMin: '1', diasMax: '3' },
            expreso: { priceCentavos: 700000, diasMin: '1', diasMax: '2' },
          },
          rateSource: 'official',
          quotedAt: new Date().toISOString(),
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<ShippingQuoteAccordion variantId={VARIANT_ID} />)
    openAccordion()

    fillCp('1425')
    selectProvincia('AR-B')
    submitForm()

    await waitFor(() => {
      expect(screen.getAllByText('Clásico').length).toBe(1)
    })

    expect(screen.getAllByText('Expreso').length).toBe(1)
    expect(screen.getByText(normalizeSpaces(formatPrice(620100)))).toBeInTheDocument()
    expect(screen.getByText(normalizeSpaces(formatPrice(950000)))).toBeInTheDocument()
    expect(screen.queryByText(normalizeSpaces(formatPrice(368600)))).not.toBeInTheDocument()
    expect(screen.queryByText(normalizeSpaces(formatPrice(700000)))).not.toBeInTheDocument()
  })

  it('muestra un mensaje de error amigable cuando la API responde 422', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ error: 'shipping_unresolvable' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<ShippingQuoteAccordion variantId={VARIANT_ID} />)
    openAccordion()

    fillCp('1425')
    selectProvincia('AR-B')
    submitForm()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('No pudimos calcular el envío para este producto')
    })
  })

  it('muestra un mensaje de error amigable cuando la API responde 429', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: 'Too many requests' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<ShippingQuoteAccordion variantId={VARIANT_ID} />)
    openAccordion()

    fillCp('1425')
    selectProvincia('AR-B')
    submitForm()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Demasiadas consultas, esperá un momento')
    })
  })
})
