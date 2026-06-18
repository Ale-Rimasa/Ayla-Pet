import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CheckoutForm } from '@/components/checkout/CheckoutForm'
import { useCartStore } from '@/store/cart.store'
import { useCheckoutStore } from '@/store/checkout.store'

// El Select de Base UI necesita PointerEvents reales que jsdom no implementa.
// Reemplazamos por <select> nativo (mismo patrón que CheckoutForm.test.tsx).
// `name` distingue el selector de provincia (sin name) del de agencia
// (name="agencyCode"), seteado explícitamente en CheckoutForm.tsx.
vi.mock('@/components/ui/select', async () => {
  const { AR_PROVINCES_LIST } = await import('@/lib/constants')
  return {
    Select: ({ value, onValueChange, name, children }: {
      value: string
      onValueChange: (v: string) => void
      name?: string
      children?: React.ReactNode
    }) => {
      const isAgencySelect = name === 'agencyCode'
      return (
        <select
          data-testid={isAgencySelect ? 'agency-select' : 'provincia-select'}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
        >
          {!isAgencySelect && value === '' && (
            <option value="">Seleccioná una provincia</option>
          )}
          {!isAgencySelect
            ? AR_PROVINCES_LIST.map(({ name: provName, code }: { name: string; code: string }) => (
                <option key={code} value={code}>{provName}</option>
              ))
            : children}
        </select>
      )
    },
    SelectTrigger: () => null,
    SelectContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    SelectItem: ({ value, children }: { value: string; children?: React.ReactNode }) => (
      <option value={value}>{children}</option>
    ),
  }
})

vi.mock('@/lib/actions/order-photos', () => ({
  uploadOrderReferencePhoto: vi.fn().mockResolvedValue({ ok: true }),
}))

const VARIANT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

const QUOTE_RESPONSE = {
  correoArgentino: {
    domicilio: {
      clasico: { priceCentavos: 620100, diasMin: '2', diasMax: '5' },
      expreso: { priceCentavos: 950000, diasMin: '1', diasMax: '2' },
    },
    sucursal: {
      clasico: { priceCentavos: 368600, diasMin: '1', diasMax: '3' },
      expreso: { priceCentavos: 700000, diasMin: '1', diasMax: '2' },
    },
    rateSource: 'mock',
    quotedAt: '',
  },
}

const AGENCIES_RESPONSE = {
  agencies: [
    { code: 'B-0123', name: 'Sucursal La Plata Centro', address: 'Calle 7 1234', postalCode: '1900' },
    { code: 'B-0456', name: 'Sucursal La Plata Norte', address: 'Av. 44 567', postalCode: '1900' },
  ],
}

const normalizeSpaces = (s: string) => s.replace(/\s/g, ' ')

function mockFetch(handlers: {
  quote?: { status: number; body: unknown }
  orders?: { status: number; body: unknown }
  agencies?: { status: number; body: unknown }
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
    if (typeof url === 'string' && url.startsWith('/api/shipping/agencies')) {
      const r = handlers.agencies ?? { status: 200, body: AGENCIES_RESPONSE }
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
  fireEvent.change(screen.getByLabelText(/código postal/i), { target: { value: '1900' } })
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

// Entregas a sucursal deshabilitadas a pedido del cliente. Estos tests quedan
// skippeados (no borrados) para reactivarlos junto con la feature cuando vuelva.
describe.skip('CheckoutForm — selector de sucursal de destino (Fase 2)', () => {
  it('no muestra el selector de agencia ni consulta /api/shipping/agencies para domicilio (default)', async () => {
    const fetchMock = mockFetch({})
    render(<CheckoutForm />)

    fillAddress()

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/shipping/quote', expect.anything())
    }, { timeout: 3000 })

    expect(screen.queryByTestId('agency-select')).not.toBeInTheDocument()
    expect(
      fetchMock.mock.calls.some(([u]) => typeof u === 'string' && u.startsWith('/api/shipping/agencies'))
    ).toBe(false)
  })

  it('muestra el selector de agencia y lo puebla al elegir sucursal con provincia/CP válidos', async () => {
    const fetchMock = mockFetch({})
    render(<CheckoutForm />)

    fillAddress()

    await waitFor(() => {
      expect(screen.getByLabelText(/a sucursal — clásico/i)).toBeInTheDocument()
    }, { timeout: 3000 })

    fireEvent.click(screen.getByLabelText(/a sucursal — clásico/i))

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([u]) => typeof u === 'string' && u.startsWith('/api/shipping/agencies'))
      ).toBe(true)
    }, { timeout: 3000 })

    const agenciesCall = fetchMock.mock.calls.find(([u]) => typeof u === 'string' && u.startsWith('/api/shipping/agencies'))!
    expect(agenciesCall[0]).toContain('provincia=AR-B')
    expect(agenciesCall[0]).toContain('cp=1900')

    await waitFor(() => {
      const select = screen.getByTestId('agency-select')
      expect(select).toBeInTheDocument()
      expect(screen.getByText(/sucursal la plata centro/i)).toBeInTheDocument()
      expect(screen.getByText(/sucursal la plata norte/i)).toBeInTheDocument()
    })
  })

  it('bloquea el submit sin elegir agencia cuando es sucursal', async () => {
    const fetchMock = mockFetch({})
    vi.stubGlobal('open', vi.fn())
    render(<CheckoutForm />)

    fillCustomer()
    fillAddress()

    await waitFor(() => {
      expect(screen.getByLabelText(/a sucursal — clásico/i)).toBeInTheDocument()
    }, { timeout: 3000 })

    fireEvent.click(screen.getByLabelText(/a sucursal — clásico/i))

    await waitFor(() => {
      expect(screen.getByTestId('agency-select')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /coordinar por whatsapp/i }))

    await waitFor(() => {
      expect(screen.getByText(/eleg[ií].*sucursal/i)).toBeInTheDocument()
    })

    expect(fetchMock.mock.calls.some(([u]) => u === '/api/orders')).toBe(false)
    expect(vi.mocked(window.open)).not.toHaveBeenCalled()
  })

  it('al elegir una agencia y enviar, el body incluye agencyCode y agencySnapshot y el costo de envío no cambia', async () => {
    const fetchMock = mockFetch({})
    vi.stubGlobal('open', vi.fn())
    render(<CheckoutForm />)

    fillCustomer()
    fillAddress()

    await waitFor(() => {
      expect(screen.getByLabelText(/a sucursal — clásico/i)).toBeInTheDocument()
    }, { timeout: 3000 })

    fireEvent.click(screen.getByLabelText(/a sucursal — clásico/i))

    await waitFor(() => {
      expect(screen.getByTestId('agency-select')).toBeInTheDocument()
      expect(screen.getByText(/sucursal la plata centro/i)).toBeInTheDocument()
    })

    // Precio antes de elegir agencia
    await waitFor(() => {
      expect(screen.getAllByText(normalizeSpaces('$ 3.686')).length).toBeGreaterThan(0)
    })

    fireEvent.change(screen.getByTestId('agency-select'), { target: { value: 'B-0123' } })

    // El precio mostrado no cambia tras elegir la agencia
    expect(screen.getAllByText(normalizeSpaces('$ 3.686')).length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: /coordinar por whatsapp/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/orders', expect.anything())
    }, { timeout: 3000 })

    const orderCall = fetchMock.mock.calls.find(([u]) => u === '/api/orders')!
    const body = JSON.parse((orderCall[1] as RequestInit).body as string)
    expect(body.agencyCode).toBe('B-0123')
    expect(body.agencySnapshot).toEqual(AGENCIES_RESPONSE.agencies[0])
    expect(body.shippingMethod).toBe('correo-argentino-sucursal')
  })

  it('no envía agencyCode/agencySnapshot para domicilio', async () => {
    const fetchMock = mockFetch({})
    vi.stubGlobal('open', vi.fn())
    render(<CheckoutForm />)

    fillCustomer()
    fillAddress()

    await waitFor(() => {
      expect(screen.getAllByText(normalizeSpaces('$ 6.201')).length).toBeGreaterThan(0)
    }, { timeout: 3000 })

    fireEvent.click(screen.getByRole('button', { name: /coordinar por whatsapp/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/orders', expect.anything())
    }, { timeout: 3000 })

    const orderCall = fetchMock.mock.calls.find(([u]) => u === '/api/orders')!
    const body = JSON.parse((orderCall[1] as RequestInit).body as string)
    expect(body).not.toHaveProperty('agencyCode')
    expect(body).not.toHaveProperty('agencySnapshot')
  })

  it('muestra estado degradado y mantiene el submit bloqueado si /api/shipping/agencies falla', async () => {
    const fetchMock = mockFetch({ agencies: { status: 502, body: { error: 'agencies_unavailable' } } })
    vi.stubGlobal('open', vi.fn())
    render(<CheckoutForm />)

    fillCustomer()
    fillAddress()

    await waitFor(() => {
      expect(screen.getByLabelText(/a sucursal — clásico/i)).toBeInTheDocument()
    }, { timeout: 3000 })

    fireEvent.click(screen.getByLabelText(/a sucursal — clásico/i))

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([u]) => typeof u === 'string' && u.startsWith('/api/shipping/agencies'))
      ).toBe(true)
    }, { timeout: 3000 })

    await waitFor(() => {
      expect(screen.getByText(/no.*pudimos.*sucursales|no hay sucursales disponibles/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /coordinar por whatsapp/i }))

    await waitFor(() => {
      expect(screen.getByText(/eleg[ií].*sucursal/i)).toBeInTheDocument()
    })

    expect(fetchMock.mock.calls.some(([u]) => u === '/api/orders')).toBe(false)
  })
})
