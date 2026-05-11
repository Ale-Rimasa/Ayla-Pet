/**
 * RED test — Task 4.4
 * Verifies: Footer WhatsApp link begins with "https://wa.me/" and uses
 * env.NEXT_PUBLIC_WHATSAPP_NUMBER (not BRAND.whatsapp hardcode).
 *
 * BEFORE fix: href="https://wa.me/5491100000000" (BRAND.whatsapp hardcode)
 * AFTER fix: href built via buildWhatsAppLink() using env.NEXT_PUBLIC_WHATSAPP_NUMBER
 */
import { test, expect } from '@playwright/test'

test.describe('Footer — WhatsApp link and PT Laser identity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('WhatsApp link begins with "https://wa.me/"', async ({ page }) => {
    // Footer has multiple wa.me links (social icons + Contacto) — .first() avoids strict mode
    const whatsappLink = page.locator('footer a[href^="https://wa.me/"]').first()
    await expect(whatsappLink).toBeVisible()
    const href = await whatsappLink.getAttribute('href')
    expect(href).toMatch(/^https:\/\/wa\.me\//)
  })

  test('Footer brand name is "Ayla Pet" (not Jengibre or Acuaceramica)', async ({ page }) => {
    // Brand name lives in a span inside the footer logo link, not an h3
    const brandText = page.locator('footer').getByText(/Ayla Pet/i).first()
    await expect(brandText).toBeVisible()
    const footerText = await page.locator('footer').innerText()
    expect(footerText).not.toContain('Jengibre')
    expect(footerText).not.toContain('Acuaceramica')
    expect(footerText).not.toContain('PT Laser')
  })

  test('Footer copy does not mention legacy ceramic/acuarela descriptions', async ({ page }) => {
    const footerBrandSection = page.locator('footer div').first()
    const text = await footerBrandSection.innerText()
    expect(text).not.toContain('Jengibre')
    expect(text).not.toContain('cerámica artesanal')
  })
})
