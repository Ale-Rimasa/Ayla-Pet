import { describe, it, expect } from 'vitest'
import { getMainImage, mapProductImage } from '@/lib/db/products'
import type { ProductImage } from '@/types'

// ─── getMainImage ─────────────────────────────────────────────────────────

describe('getMainImage', () => {
  it('returns undefined for empty array', () => {
    expect(getMainImage([])).toBeUndefined()
  })

  it('returns the url of the first image', () => {
    const images: ProductImage[] = [
      { id: '1', productId: 'p1', url: 'https://x.com/a.jpg', sortOrder: 0, createdAt: '' },
      { id: '2', productId: 'p1', url: 'https://x.com/b.jpg', sortOrder: 1, createdAt: '' },
    ]
    expect(getMainImage(images)).toBe('https://x.com/a.jpg')
  })

  it('returns the url of a single-element array', () => {
    const images: ProductImage[] = [
      { id: '1', productId: 'p1', url: 'https://x.com/a.jpg', sortOrder: 0, createdAt: '' },
    ]
    expect(getMainImage(images)).toBe('https://x.com/a.jpg')
  })
})

// ─── mapProductImage ──────────────────────────────────────────────────────

describe('mapProductImage', () => {
  it('maps all fields correctly', () => {
    const row = {
      id: 'img-1',
      product_id: 'prod-1',
      url: 'https://x.com/a.jpg',
      alt: 'Un perro con chapita',
      label: 'Frente',
      sort_order: 0,
      created_at: '2026-01-01T00:00:00Z',
    }
    const result = mapProductImage(row)
    expect(result).toEqual({
      id: 'img-1',
      productId: 'prod-1',
      url: 'https://x.com/a.jpg',
      alt: 'Un perro con chapita',
      label: 'Frente',
      sortOrder: 0,
      createdAt: '2026-01-01T00:00:00Z',
    })
  })

  it('maps null alt to undefined', () => {
    const row = {
      id: 'img-2', product_id: 'p1', url: 'https://x.com/b.jpg',
      alt: null, label: null, sort_order: 1, created_at: '',
    }
    const result = mapProductImage(row)
    expect(result.alt).toBeUndefined()
    expect(result.label).toBeUndefined()
  })
})
