import { describe, it, expect } from 'vitest'
import { BRAND } from '@/lib/constants'
import { metadata as productosMetadata } from '@/app/(storefront)/productos/page'

// generateMetadata pages ([slug]) require DB mocks — covered by E2E (navbar.spec, footer.spec)

describe('BRAND.name — source of truth', () => {
  it('equals "Ayla"', () => {
    expect(BRAND.name).toBe('Ayla')
  })

  it('does NOT contain "Jengibre"', () => {
    expect(BRAND.name).not.toContain('Jengibre')
  })

  it('does NOT contain "Acuaceramica"', () => {
    expect(BRAND.name).not.toContain('Acuaceramica')
  })

  it('BRAND has no legacy whatsapp field', () => {
    expect('whatsapp' in BRAND).toBe(false)
  })
})

describe('productos/page.tsx — metadata export', () => {
  it('description contains BRAND.name', () => {
    expect(productosMetadata.description).toContain(BRAND.name)
  })

  it('description does NOT contain "Jengibre"', () => {
    expect(productosMetadata.description).not.toContain('Jengibre')
  })

  it('description does NOT contain "Acuaceramica"', () => {
    expect(productosMetadata.description).not.toContain('Acuaceramica')
  })
})
