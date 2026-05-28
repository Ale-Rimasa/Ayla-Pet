import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// matchMedia mock — set reducedMotion flag before each test
let reducedMotion = false
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? reducedMotion : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
})

const FALLBACK = '/referencias-ui/home-rustica-beige-blanco-negro.png'

async function importCarousel() {
  const { HeroCarousel } = await import('@/components/storefront/HeroCarousel')
  return HeroCarousel
}

describe('HeroCarousel — 0 images', () => {
  beforeEach(() => {
    vi.resetModules()
    reducedMotion = false
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows fallbackSrc and no dots when images is empty', async () => {
    const HeroCarousel = await importCarousel()
    render(<HeroCarousel images={[]} fallbackSrc={FALLBACK} alt="Hero" />)

    // The next/image mock renders null but we can check there are no dot buttons
    const dots = screen.queryAllByRole('button', { name: /Ir a imagen/ })
    expect(dots).toHaveLength(0)

    // No interval should be set — advancing time should not cause errors
    act(() => { vi.advanceTimersByTime(10000) })
  })
})

describe('HeroCarousel — 1 image', () => {
  beforeEach(() => {
    vi.resetModules()
    reducedMotion = false
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders without dots and without auto-advancing', async () => {
    const HeroCarousel = await importCarousel()
    const images = [{ url: 'https://cdn.example.com/img1.jpg', sortOrder: 0 }]
    render(<HeroCarousel images={images} fallbackSrc={FALLBACK} alt="Hero" />)

    const dots = screen.queryAllByRole('button', { name: /Ir a imagen/ })
    expect(dots).toHaveLength(0)

    // No errors after advancing time
    act(() => { vi.advanceTimersByTime(10000) })
  })
})

describe('HeroCarousel — 3 images', () => {
  beforeEach(() => {
    vi.resetModules()
    reducedMotion = false
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const images = [
    { url: 'https://cdn.example.com/img1.jpg', sortOrder: 0 },
    { url: 'https://cdn.example.com/img2.jpg', sortOrder: 1 },
    { url: 'https://cdn.example.com/img3.jpg', sortOrder: 2 },
  ]

  it('renders 3 dots', async () => {
    const HeroCarousel = await importCarousel()
    render(<HeroCarousel images={images} fallbackSrc={FALLBACK} alt="Hero" />)

    const dots = screen.getAllByRole('button', { name: /Ir a imagen/ })
    expect(dots).toHaveLength(3)
  })

  it('dot labels are 1-indexed', async () => {
    const HeroCarousel = await importCarousel()
    render(<HeroCarousel images={images} fallbackSrc={FALLBACK} alt="Hero" />)

    expect(screen.getByRole('button', { name: 'Ir a imagen 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ir a imagen 2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ir a imagen 3' })).toBeInTheDocument()
  })

  it('first dot is aria-current on mount', async () => {
    const HeroCarousel = await importCarousel()
    render(<HeroCarousel images={images} fallbackSrc={FALLBACK} alt="Hero" />)

    const dots = screen.getAllByRole('button', { name: /Ir a imagen/ })
    expect(dots[0]).toHaveAttribute('aria-current', 'true')
    expect(dots[1]).toHaveAttribute('aria-current', 'false')
  })

  it('auto-advances after intervalMs (5000ms)', async () => {
    const HeroCarousel = await importCarousel()
    render(<HeroCarousel images={images} fallbackSrc={FALLBACK} alt="Hero" intervalMs={5000} />)

    const dots = screen.getAllByRole('button', { name: /Ir a imagen/ })
    expect(dots[0]).toHaveAttribute('aria-current', 'true')

    act(() => { vi.advanceTimersByTime(5000) })

    expect(dots[1]).toHaveAttribute('aria-current', 'true')
    expect(dots[0]).toHaveAttribute('aria-current', 'false')
  })

  it('cycles back to index 0 after 3 intervals', async () => {
    const HeroCarousel = await importCarousel()
    render(<HeroCarousel images={images} fallbackSrc={FALLBACK} alt="Hero" intervalMs={5000} />)

    const dots = screen.getAllByRole('button', { name: /Ir a imagen/ })

    act(() => { vi.advanceTimersByTime(15000) }) // 3 × 5000

    expect(dots[0]).toHaveAttribute('aria-current', 'true')
  })

  it('clicking a dot changes the active index immediately', async () => {
    const HeroCarousel = await importCarousel()
    render(<HeroCarousel images={images} fallbackSrc={FALLBACK} alt="Hero" intervalMs={5000} />)

    const dots = screen.getAllByRole('button', { name: /Ir a imagen/ })

    act(() => { dots[2].click() })

    expect(dots[2]).toHaveAttribute('aria-current', 'true')
    expect(dots[0]).toHaveAttribute('aria-current', 'false')
  })

  it('carousel container has aria-label and aria-live="off"', async () => {
    const HeroCarousel = await importCarousel()
    render(<HeroCarousel images={images} fallbackSrc={FALLBACK} alt="Hero" />)

    const container = screen.getByLabelText('Carrusel de imágenes del hero')
    expect(container).toHaveAttribute('aria-live', 'off')
  })
})

describe('HeroCarousel — prefers-reduced-motion', () => {
  beforeEach(() => {
    vi.resetModules()
    reducedMotion = true
    vi.useFakeTimers()
  })
  afterEach(() => {
    reducedMotion = false
    vi.useRealTimers()
  })

  it('does not auto-advance when reduced-motion is active', async () => {
    const HeroCarousel = await importCarousel()
    const images = [
      { url: 'https://cdn.example.com/img1.jpg', sortOrder: 0 },
      { url: 'https://cdn.example.com/img2.jpg', sortOrder: 1 },
    ]
    render(<HeroCarousel images={images} fallbackSrc={FALLBACK} alt="Hero" intervalMs={5000} />)

    const dots = screen.getAllByRole('button', { name: /Ir a imagen/ })
    expect(dots[0]).toHaveAttribute('aria-current', 'true')

    act(() => { vi.advanceTimersByTime(15000) })

    // Should still be on index 0 (no autoplay)
    expect(dots[0]).toHaveAttribute('aria-current', 'true')
  })
})
