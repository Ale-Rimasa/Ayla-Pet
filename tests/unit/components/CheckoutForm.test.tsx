import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CheckoutForm } from '@/components/checkout/CheckoutForm'
import { useCartStore } from '@/store/cart.store'
import { useCheckoutStore } from '@/store/checkout.store'

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

vi.mock('@/lib/actions/order-photos', () => ({
  uploadOrderReferencePhoto: vi.fn().mockResolvedValue({ ok: true }),
}))

const VARIANT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

const QUOTE_RESPONSE = {
  correoArgentino: {
    aDomicilioCentavos: 620100,
    aSucursalCentavos: 368600,
    aDomicilioDiasMin: '2',
    aDomicilioDiasMax: '5',
    aSucursalDiasMin: '1',
    aSucursalDiasMax: '3',
  },
}

// Normaliza espacios (incluido NBSP) para comparar con el texto renderizado
const normalizeSpaces = (s: string) => s.replace(/\s/g, ' ')

function mockFetch(handlers: {
  quote?: { status: number; body: unknown }
  orders?: { status: number; body: unknown }
}) {
  const fetchMock = vi.fn().mockImplementation(async (url: string) => {
    if (url === '/api/shipping/quote') {
      const r = handlers.quote ?? { status: 200, body: QUOTE_RESPONSE }
      return { ok: r.status < 300, status: r.status, json: async () => r.body }
    }
    if (url === '/api/orders') {
      const r = handlers.orders ?? { status: 201, body: { orderId: 'order-1' } }
      return { ok: r.status < 300, status: r.status, json: async () => r.body }
    }
    throw new Error(`fetch inesperado: ${url}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function fillAddress() {
  fireEvent.change(screen.getByLabelText(/calle y número/i), { target: { value: 'Corrientes 1234' } })
  fireEvent.change(screen.getByLabelText(/ciudad/i), { target: { value: 'CABA' } })
  fireEvent.change(screen.getByTestId('provincia-select'), { target: { value: 'AR-B' } })
  fireEvent.change(screen.getByLabelText(/código postal/i), { target: { value: '1704' } })
}

function fillCustomer() {
  fireEvent.change(screen.getByLabelText(/nombre completo/i), { target: { value: 'Ana García' } })
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'ana@test.com' } })
  fireEvent.change(screen.getByLabelText(/teléfono/i), { target: { value: '1112345678' } })
}

beforeEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  useCartStore.setState({
    items: [{
      variantId: VARIANT_ID,
      productId: 'prod-1',
      name: 'Chapita',
      variantName: 'S',
      price: 500000,
      quantity: 1,
      image: null,
      slug: 'chapita',
    } as never],
  })
  useCheckoutStore.setState({ customerInfo: null, shippingAddress: null })
})

describe('CheckoutForm — método de envío y total', () => {
  it('cotiza automáticamente cuando CP y provincia están completos y muestra precios', async () => {
    const fetchMock = mockFetch({})
    render(<CheckoutForm />)

    fillAddress()

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/shipping/quote', expect.anything())
    }, { timeout: 3000 })

    await waitFor(() => {
      expect(screen.getAllByText(normalizeSpaces('$ 6.201')).length).toBeGreaterThan(0)
      expect(screen.getByText(normalizeSpaces('$ 3.686'))).toBeInTheDocument()
    })

    const quoteCall = fetchMock.mock.calls.find(([u]) => u === '/api/shipping/quote')!
    const body = JSON.parse((quoteCall[1] as RequestInit).body as string)
    expect(body).toEqual({
      cp: '1704',
      provincia: 'AR-B',
      items: [{ variantId: VARIANT_ID, quantity: 1 }],
    })
  })

  it('el total del resumen suma subtotal + envío según el método elegido', async () => {
    mockFetch({})
    render(<CheckoutForm />)

    fillAddress()

    // Domicilio es el default: 5000,00 + 6201,00 = 11201,00
    await waitFor(() => {
      expect(screen.getByText(normalizeSpaces('$ 11.201'))).toBeInTheDocument()
    }, { timeout: 3000 })

    // Cambio a sucursal: 5000,00 + 3686,00 = 8686,00
    fireEvent.click(screen.getByLabelText(/a sucursal/i))
    await waitFor(() => {
      expect(screen.getByText(normalizeSpaces('$ 8.686'))).toBeInTheDocument()
    })
  })

  it('sin cotización el resumen muestra "A calcular" y no rompe', () => {
    mockFetch({})
    render(<CheckoutForm />)

    expect(screen.getByText('A calcular')).toBeInTheDocument()
    expect(screen.getByText(/completá el código postal/i)).toBeInTheDocument()
  })

  it('envía clientShippingCost del método elegido al crear el pedido', async () => {
    const fetchMock = mockFetch({})
    vi.stubGlobal('open', vi.fn())
    render(<CheckoutForm />)

    fillCustomer()
    fillAddress()

    await waitFor(() => {
      expect(screen.getAllByText(normalizeSpaces('$ 6.201')).length).toBeGreaterThan(0)
    }, { timeout: 3000 })

    fireEvent.click(screen.getByLabelText(/a sucursal/i))
    fireEvent.click(screen.getByRole('button', { name: /pedilo por whatsapp/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/orders', expect.anything())
    }, { timeout: 3000 })

    const orderCall = fetchMock.mock.calls.find(([u]) => u === '/api/orders')!
    const body = JSON.parse((orderCall[1] as RequestInit).body as string)
    expect(body.shippingMethod).toBe('correo-argentino-sucursal')
    expect(body.clientShippingCost).toBe(368600)
  })

  it('ante un 409 shipping_price_changed re-cotiza y pide reconfirmar sin crear pedido', async () => {
    const fetchMock = mockFetch({
      orders: { status: 409, body: { error: 'shipping_price_changed', newShippingCost: 700000 } },
    })
    vi.stubGlobal('open', vi.fn())
    render(<CheckoutForm />)

    fillCustomer()
    fillAddress()

    await waitFor(() => {
      expect(screen.getAllByText(normalizeSpaces('$ 6.201')).length).toBeGreaterThan(0)
    }, { timeout: 3000 })

    fireEvent.click(screen.getByRole('button', { name: /pedilo por whatsapp/i }))

    await waitFor(() => {
      expect(screen.getByText(/el costo de envío se actualizó/i)).toBeInTheDocument()
    }, { timeout: 3000 })

    expect(vi.mocked(window.open)).not.toHaveBeenCalled()
    // Re-cotizó tras el 409
    const quoteCalls = fetchMock.mock.calls.filter(([u]) => u === '/api/shipping/quote')
    expect(quoteCalls.length).toBeGreaterThanOrEqual(2)
  })
})
