import { test, expect } from '@playwright/test'

test.describe('Admin — unauthenticated access', () => {
  test('redirects /admin to login when unauthenticated', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/admin\/login/)
  })

  test('redirects /admin/productos to login when unauthenticated', async ({ page }) => {
    await page.goto('/admin/productos')
    await expect(page).toHaveURL(/admin\/login/)
  })

  test('redirects /admin/categorias to login when unauthenticated', async ({ page }) => {
    await page.goto('/admin/categorias')
    await expect(page).toHaveURL(/admin\/login/)
  })

  test('redirects /admin/pedidos to login when unauthenticated', async ({ page }) => {
    await page.goto('/admin/pedidos')
    await expect(page).toHaveURL(/admin\/login/)
  })

  test('login page renders email and password fields', async ({ page }) => {
    await page.goto('/admin/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })
})
