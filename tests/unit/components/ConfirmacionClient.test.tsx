import { vi, describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Order } from '@/types'

vi.mock('@/components/ui/button', () => ({
  buttonVariants: () => 'btn',
  Button: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}))

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('lucide-react', () => ({
  CheckCircle: () => <svg data-testid="check-circle" />,
  Clock: () => <svg data-testid="clock-icon" />,
  Copy: () => <svg data-testid="copy-icon" />,
  XCircle: () => <svg data-testid="x-circle-icon" />,
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/store/cart.store', () => ({
  useCartStore: (selector: (s: { clearCart: () => void }) => unknown) =>
    selector({ clearCart: vi.fn() }),
}))

vi.mock('@/store/checkout.store', () => ({
  useCheckoutStore: (selector: (s: { resetCheckout: () => void }) => unknown) =>
    selector({ resetCheckout: vi.fn() }),
}))

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ORDER_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

function makeOrder(status: 'pending' | 'paid'): Order {
  return {
    id: ORDER_UUID,
    status,
    customer: { name: 'Ana García', email: 'ana@test.com', phone: '1112345678' },
    shippingAddress: {
      street: 'Corrientes 1234',
      city: 'CABA',
      province: 'Buenos Aires',
      postalCode: '1043',
    },
    items: [],
    subtotal: 500000,
    shippingCost: 50000,
    total: 550000,
    mpPreferenceId: null,
    mpPaymentId: null,
    notes: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

let ConfirmacionClient: (typeof import('@/app/(storefront)/checkout/confirmacion/ConfirmacionClient'))['ConfirmacionClient']

beforeEach(async () => {
  vi.resetModules()
  const mod = await import('@/app/(storefront)/checkout/confirmacion/ConfirmacionClient')
  ConfirmacionClient = mod.ConfirmacionClient
})

describe('ConfirmacionClient — transferencia manual (mpStatus=null)', () => {
  it('renders "¡Pedido recibido!"', () => {
    render(<ConfirmacionClient order={makeOrder('pending')} mpStatus={null} />)
    expect(screen.getByText('¡Pedido recibido!')).toBeInTheDocument()
  })

  it('shows the order number', () => {
    render(<ConfirmacionClient order={makeOrder('pending')} mpStatus={null} />)
    const shortId = ORDER_UUID.slice(0, 8).toUpperCase()
    expect(screen.getAllByText(new RegExp(shortId)).length).toBeGreaterThan(0)
  })

  it('shows bank transfer data section', () => {
    render(<ConfirmacionClient order={makeOrder('pending')} mpStatus={null} />)
    expect(screen.getByText('Datos para la transferencia')).toBeInTheDocument()
    expect(screen.getByText('CBU')).toBeInTheDocument()
    expect(screen.getByText('Alias')).toBeInTheDocument()
  })

  it('CTA "Subir mis fotos" links to /mi-pedido/<id>/fotos', () => {
    render(<ConfirmacionClient order={makeOrder('pending')} mpStatus={null} />)
    const link = screen.getByRole('link', { name: /subir mis fotos/i })
    expect(link.getAttribute('href')).toBe(`/mi-pedido/${ORDER_UUID}/fotos`)
  })

  it('renders the same UI regardless of order.status', () => {
    const { unmount } = render(<ConfirmacionClient order={makeOrder('pending')} mpStatus={null} />)
    expect(screen.getByText('¡Pedido recibido!')).toBeInTheDocument()
    unmount()

    render(<ConfirmacionClient order={makeOrder('paid')} mpStatus={null} />)
    expect(screen.getByText('¡Pedido recibido!')).toBeInTheDocument()
  })
})

describe('ConfirmacionClient — MercadoPago aprobado (mpStatus="approved")', () => {
  it('renders "¡Pago aprobado!"', () => {
    render(<ConfirmacionClient order={makeOrder('pending')} mpStatus="approved" />)
    expect(screen.getByText('¡Pago aprobado!')).toBeInTheDocument()
  })

  it('does NOT show bank transfer data', () => {
    render(<ConfirmacionClient order={makeOrder('pending')} mpStatus="approved" />)
    expect(screen.queryByText('Datos para la transferencia')).not.toBeInTheDocument()
  })

  it('shows CheckCircle icon', () => {
    render(<ConfirmacionClient order={makeOrder('pending')} mpStatus="approved" />)
    expect(screen.getByTestId('check-circle')).toBeInTheDocument()
  })

  it('CTA "Subir mis fotos" links to /mi-pedido/<id>/fotos', () => {
    render(<ConfirmacionClient order={makeOrder('pending')} mpStatus="approved" />)
    const link = screen.getByRole('link', { name: /subir mis fotos/i })
    expect(link.getAttribute('href')).toBe(`/mi-pedido/${ORDER_UUID}/fotos`)
  })
})

describe('ConfirmacionClient — MercadoPago pendiente (mpStatus="pending")', () => {
  it('renders "Pago en proceso"', () => {
    render(<ConfirmacionClient order={makeOrder('pending')} mpStatus="pending" />)
    expect(screen.getByText('Pago en proceso')).toBeInTheDocument()
  })

  it('renders "Pago en proceso" for in_process status', () => {
    render(<ConfirmacionClient order={makeOrder('pending')} mpStatus="in_process" />)
    expect(screen.getByText('Pago en proceso')).toBeInTheDocument()
  })

  it('shows Clock icon', () => {
    render(<ConfirmacionClient order={makeOrder('pending')} mpStatus="pending" />)
    expect(screen.getByTestId('clock-icon')).toBeInTheDocument()
  })

  it('does NOT show bank transfer data', () => {
    render(<ConfirmacionClient order={makeOrder('pending')} mpStatus="pending" />)
    expect(screen.queryByText('Datos para la transferencia')).not.toBeInTheDocument()
  })
})

describe('ConfirmacionClient — MercadoPago rechazado (mpStatus="rejected")', () => {
  it('renders "Pago rechazado"', () => {
    render(<ConfirmacionClient order={makeOrder('pending')} mpStatus="rejected" />)
    expect(screen.getByText('Pago rechazado')).toBeInTheDocument()
  })

  it('shows XCircle icon', () => {
    render(<ConfirmacionClient order={makeOrder('pending')} mpStatus="rejected" />)
    expect(screen.getByTestId('x-circle-icon')).toBeInTheDocument()
  })

  it('shows "Reintentar pago" CTA linking to /checkout', () => {
    render(<ConfirmacionClient order={makeOrder('pending')} mpStatus="rejected" />)
    const link = screen.getByRole('link', { name: /reintentar pago/i })
    expect(link.getAttribute('href')).toBe('/checkout')
  })

  it('does NOT show order summary', () => {
    render(<ConfirmacionClient order={makeOrder('pending')} mpStatus="rejected" />)
    expect(screen.queryByText('Resumen del pedido')).not.toBeInTheDocument()
  })

  it('does NOT show bank transfer data', () => {
    render(<ConfirmacionClient order={makeOrder('pending')} mpStatus="rejected" />)
    expect(screen.queryByText('Datos para la transferencia')).not.toBeInTheDocument()
  })
})
