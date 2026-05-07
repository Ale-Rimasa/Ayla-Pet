import { describe, it, expect } from 'vitest'
import { cn, formatPrice, buildWhatsAppLink } from '@/lib/utils'

describe('cn', () => {
  it('combines class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('resolves Tailwind conflicts — last wins', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2')
  })

  it('handles undefined, null and false gracefully', () => {
    expect(cn('foo', undefined, null, false, 'bar')).toBe('foo bar')
  })

  it('returns empty string when given no truthy values', () => {
    expect(cn(undefined, null, false)).toBe('')
  })
})

describe('formatPrice', () => {
  it('converts centavos to pesos — 100 centavos → $ 1', () => {
    const result = formatPrice(100)
    expect(result).toContain('$')
    expect(result).toContain('1')
  })

  it('handles 0 → $ 0', () => {
    const result = formatPrice(0)
    expect(result).toContain('$')
    expect(result).toContain('0')
  })

  it('formats large values — 1000000 centavos = $ 10.000', () => {
    const result = formatPrice(1_000_000)
    expect(result).toContain('$')
    // 10.000 with dot as thousands separator (es-AR locale)
    expect(result).toMatch(/10[.,]?000/)
  })

  it('rounds to integer (no decimals)', () => {
    // minimumFractionDigits: 0 — no comma/decimal separator should appear
    const result = formatPrice(999)
    expect(result).not.toMatch(/[.,]\d{2}$/)
  })
})

describe('buildWhatsAppLink', () => {
  it('returns a URL starting with https://wa.me/', () => {
    const link = buildWhatsAppLink('Hola')
    expect(link).toMatch(/^https:\/\/wa\.me\//)
  })

  it('includes the message encoded with encodeURIComponent', () => {
    const message = 'Hola, quiero hacer un pedido'
    const link = buildWhatsAppLink(message)
    expect(link).toContain(encodeURIComponent(message))
  })

  it('encodes special characters (ñ, accents, spaces)', () => {
    const message = 'Envío a Córdoba — año 2026'
    const link = buildWhatsAppLink(message)
    expect(link).toContain(encodeURIComponent(message))
    // Raw message should NOT appear unencoded after ?text=
    const textParam = link.split('?text=')[1]
    expect(textParam).toBe(encodeURIComponent(message))
  })

  it('uses the default phone number when NEXT_PUBLIC_WHATSAPP_NUMBER is not set', () => {
    const link = buildWhatsAppLink('test')
    expect(link).toContain('5491132565412')
  })
})
