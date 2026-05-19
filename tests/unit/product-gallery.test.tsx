import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProductGallery } from '@/components/product/ProductGallery'
import { ProductTrustBar } from '@/components/product/ProductTrustBar'
import type { ProductImage } from '@/types'

const makeImage = (id: string, url: string, label?: string): ProductImage => ({
  id,
  productId: 'prod-1',
  url,
  label,
  sortOrder: parseInt(id),
  createdAt: '',
})

// ─── ProductGallery ───────────────────────────────────────────────────────

describe('ProductGallery', () => {
  it('shows placeholder when images is empty', () => {
    render(<ProductGallery images={[]} productName="Chapita" />)
    expect(screen.getByText('Sin imagen')).toBeInTheDocument()
  })

  it('does NOT render thumbnails for a single image', () => {
    const images = [makeImage('0', 'https://x.com/a.jpg')]
    render(<ProductGallery images={images} productName="Chapita" />)
    expect(screen.queryByRole('button', { name: /ver imagen/i })).not.toBeInTheDocument()
  })

  it('renders thumbnails when there are multiple images', () => {
    const images = [
      makeImage('0', 'https://x.com/a.jpg'),
      makeImage('1', 'https://x.com/b.jpg'),
    ]
    render(<ProductGallery images={images} productName="Chapita" />)
    const thumbs = screen.getAllByRole('button')
    expect(thumbs).toHaveLength(2)
  })

  it('clicking a thumbnail changes aria-current to true on that button', () => {
    const images = [
      makeImage('0', 'https://x.com/a.jpg'),
      makeImage('1', 'https://x.com/b.jpg'),
    ]
    render(<ProductGallery images={images} productName="Chapita" />)
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toHaveAttribute('aria-current', 'true')
    expect(buttons[1]).toHaveAttribute('aria-current', 'false')

    fireEvent.click(buttons[1])

    expect(buttons[0]).toHaveAttribute('aria-current', 'false')
    expect(buttons[1]).toHaveAttribute('aria-current', 'true')
  })

  it('shows label overlay when current image has a label', () => {
    const images = [makeImage('0', 'https://x.com/a.jpg', 'Vista frontal')]
    render(<ProductGallery images={images} productName="Chapita" />)
    expect(screen.getByText('Vista frontal')).toBeInTheDocument()
  })
})

// ─── ProductTrustBar ──────────────────────────────────────────────────────

describe('ProductTrustBar', () => {
  it('renders exactly 4 trust items', () => {
    render(<ProductTrustBar />)
    expect(screen.getByText('Grabado permanente')).toBeInTheDocument()
    expect(screen.getByText('Material resistente')).toBeInTheDocument()
    expect(screen.getByText('Envíos a todo el país')).toBeInTheDocument()
    expect(screen.getByText('Hecho con amor')).toBeInTheDocument()
  })
})
