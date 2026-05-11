/**
 * RED test — Task 4.3
 * Verifies: Navbar category hrefs do NOT contain "undefined"
 * and display the correct PT Laser brand identity.
 *
 * BEFORE fix: CATEGORY_SLUGS.CERAMICA / CATEGORY_SLUGS.ACUARELA are undefined
 *   → hrefs become "/productos?categoria=undefined"
 * AFTER fix: hrefs use CATEGORY_SLUGS.MASCOTAS / CATEGORY_SLUGS.CHAPAS
 *   → "/categorias/mascotas" and "/categorias/chapas"
 */
import { test, expect } from '@playwright/test'

test.describe('Navbar — PT Laser brand identity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('logo text is "Ayla Pet" (not Jengibre or Acuaceramica)', async ({ page }) => {
    const logo = page.getByRole('link', { name: /Ayla Pet/i }).first()
    await expect(logo).toBeVisible()
    await expect(logo).toHaveAttribute('href', '/')
  })

  test('category links do not contain "undefined" in their href', async ({ page }) => {
    const navLinks = page.locator('header nav a')
    const count = await navLinks.count()

    for (let i = 0; i < count; i++) {
      const href = await navLinks.nth(i).getAttribute('href')
      expect(href).not.toContain('undefined')
    }
  })

  test('has a link to /categorias/mascotas', async ({ page }) => {
    // .first() — multiple links with this href may exist (nav + home sections)
    // hidden on mobile (no hamburger yet) — toBeAttached checks DOM presence only
    await expect(page.locator('a[href="/categorias/mascotas"]').first()).toBeAttached()
  })

  test('has a link to /categorias/chapas', async ({ page }) => {
    await expect(page.locator('a[href="/categorias/chapas"]').first()).toBeAttached()
  })
})
