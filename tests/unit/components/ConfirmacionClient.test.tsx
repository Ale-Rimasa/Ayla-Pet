import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import type { Order } from '@/types'

// ─── Mocks ───────────────────────────────────────────────────────────────────

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
  AlertCircle: () => <svg data-testid="alert-circle" />,
  Loader2: () => <svg data-testid="loader-icon" />,
}))

vi.mock('@/store/cart.store', () => ({
  useCartStore: (selector: (s: { clearCart: () => void }) => unknown) =>
    selector({ clearCart: vi.fn() }),
}))

const mockGetOrderStatus = vi.fn()

vi.mock('@/lib/actions/orders', () => ({
  getOrderStatus: (...args: unknown[]) => mockGetOrderStatus(...args),
  updateOrderStatus: vi.fn(),
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

// Import once — vi.mock() at top level is hoisted and applies regardless
let ConfirmacionClient: (typeof import('@/app/(storefront)/checkout/confirmacion/ConfirmacionClient'))['ConfirmacionClient']

beforeEach(async () => {
  mockGetOrderStatus.mockReset()
  vi.useFakeTimers()
  const mod = await import('@/app/(storefront)/checkout/confirmacion/ConfirmacionClient')
  ConfirmacionClient = mod.ConfirmacionClient
})

afterEach(() => {
  vi.useRealTimers()
})

describe('ConfirmacionClient', () => {
  it('renders "¡Pedido confirmado!" immediately when initial order.status is "paid"', () => {
    render(<ConfirmacionClient order={makeOrder('paid')} />)

    expect(screen.getByText('¡Pedido confirmado!')).toBeInTheDocument()
    // Should NOT start polling when already paid
    expect(mockGetOrderStatus).not.toHaveBeenCalled()
  })

  it('renders polling/loading state when initial order.status is "pending"', () => {
    mockGetOrderStatus.mockResolvedValue({ status: 'pending' })
    render(<ConfirmacionClient order={makeOrder('pending')} />)

    expect(screen.getByText(/Verificando tu pago/i)).toBeInTheDocument()
  })

  it('transitions to paid state when polling receives status "paid"', async () => {
    mockGetOrderStatus.mockResolvedValue({ status: 'paid' })
    render(<ConfirmacionClient order={makeOrder('pending')} />)

    // Advance one polling interval and drain all async work including the
    // promise chain inside the async setInterval callback
    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(screen.getByText('¡Pedido confirmado!')).toBeInTheDocument()
  })

  it('shows timeout message after 10 failed polling attempts', async () => {
    mockGetOrderStatus.mockResolvedValue({ status: 'pending' })
    render(<ConfirmacionClient order={makeOrder('pending')} />)

    // Run all 10 intervals (each 3000ms) and drain promises between them
    for (let i = 0; i < 10; i++) {
      await act(async () => {
        await vi.runAllTimersAsync()
      })
    }

    expect(screen.getByText(/Aún no confirmamos tu pago/i)).toBeInTheDocument()
    expect(screen.getByText(/te avisaremos por email/i)).toBeInTheDocument()
  })

  it('clears the timeout on unmount to avoid memory leaks', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')
    mockGetOrderStatus.mockResolvedValue({ status: 'pending' })

    const { unmount } = render(<ConfirmacionClient order={makeOrder('pending')} />)
    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()
    clearTimeoutSpy.mockRestore()
  })
})
