import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { useCartStore } from '@/store/cart.store'
import type { CartItem } from '@/types'

const mockPush = vi.fn()

// Override the global next/navigation mock with a stable push spy
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}))

const mockValidateCartBeforeCheckout = vi.fn()

vi.mock('@/lib/actions/cart', () => ({
  validateCartBeforeCheckout: (...args: unknown[]) => mockValidateCartBeforeCheckout(...args),
  getVariantsStockAction: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, size }: {
    children?: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    size?: string
  }) => (
    <button onClick={onClick} disabled={disabled} data-size={size}>
      {children}
    </button>
  ),
  buttonVariants: () => 'btn',
}))

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}))

const baseItem: CartItem = {
  id: 'prod-1',
  variantId: 'variant-1',
  name: 'Chapa grabada',
  price: 250000,
  quantity: 1,
  imageUrl: '',
}

beforeEach(() => {
  useCartStore.setState({ items: [], isCartOpen: false })
  mockValidateCartBeforeCheckout.mockReset()
  mockPush.mockReset()
})

describe('CartSummary', () => {
  it('renders checkout button when cart has items', async () => {
    useCartStore.setState({ items: [baseItem] })
    const { CartSummary } = await import('@/components/cart/CartSummary')
    render(<CartSummary />)

    const button = screen.getByText('Proceder al checkout')
    expect(button).toBeInTheDocument()
  })

  it('shows stock errors when validation fails', async () => {
    useCartStore.setState({ items: [baseItem] })
    mockValidateCartBeforeCheckout.mockResolvedValue({
      ok: false,
      errors: [{ variantId: 'v1', productName: 'Chapa', requested: 5, available: 1 }],
    })

    const { CartSummary } = await import('@/components/cart/CartSummary')
    render(<CartSummary />)

    const button = screen.getByText('Proceder al checkout')
    await act(async () => {
      fireEvent.click(button)
    })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText(/Algunos productos/)).toBeInTheDocument()
    })
  })

  it('calls router.push when checkout succeeds', async () => {
    useCartStore.setState({ items: [baseItem] })
    mockValidateCartBeforeCheckout.mockResolvedValue({ ok: true })

    const { CartSummary } = await import('@/components/cart/CartSummary')
    render(<CartSummary />)

    const button = screen.getByText('Proceder al checkout')
    await act(async () => {
      fireEvent.click(button)
    })

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/checkout')
    })
  })
})
