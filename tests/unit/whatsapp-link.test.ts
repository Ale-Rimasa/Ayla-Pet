/**
 * RED test — Task 4.1
 * Verifies: buildWhatsAppLink() reads phone from env.NEXT_PUBLIC_WHATSAPP_NUMBER,
 * NOT from BRAND.whatsapp (which will be removed in Phase 1).
 *
 * env mock in vitest.setup.ts sets NEXT_PUBLIC_WHATSAPP_NUMBER = '5491132565412'
 * BRAND.whatsapp (legacy) = '5491100000000' — must NOT appear in the URL
 */
import { describe, it, expect } from 'vitest'
import { buildWhatsAppLink } from '@/lib/utils'

const ENV_PHONE = '5491132565412' // mocked in vitest.setup.ts
const BRAND_LEGACY_PHONE = '5491100000000' // BRAND.whatsapp — must be gone

describe('buildWhatsAppLink — phone source', () => {
  it('uses NEXT_PUBLIC_WHATSAPP_NUMBER from env, not BRAND.whatsapp', () => {
    const link = buildWhatsAppLink('Hola')
    expect(link).toContain(ENV_PHONE)
  })

  it('does NOT embed the legacy BRAND.whatsapp hardcoded number', () => {
    const link = buildWhatsAppLink('Consulta')
    expect(link).not.toContain(BRAND_LEGACY_PHONE)
  })

  it('returns a valid wa.me URL with encoded message', () => {
    const message = 'Quiero una chapita para mi perro'
    const link = buildWhatsAppLink(message)
    expect(link).toMatch(/^https:\/\/wa\.me\/5491132565412\?text=/)
    expect(link).toContain(encodeURIComponent(message))
  })

  // TRIANGULATE — different messages produce different encoded URLs, proving
  // the function actually encodes input rather than returning a constant
  it('produces different URLs for different messages', () => {
    const link1 = buildWhatsAppLink('mensaje uno')
    const link2 = buildWhatsAppLink('mensaje dos')
    expect(link1).not.toBe(link2)
  })

  it('encodes special characters in message — spaces become %20', () => {
    const link = buildWhatsAppLink('hola mundo')
    expect(link).toContain('hola%20mundo')
  })
})
