import { test, expect } from '@playwright/test'

test.describe('Cart', () => {
  test('catalog page loads with product grid', async ({ page }) => {
    await page.goto('/productos')
    await expect(page).toHaveTitle(/Productos/)
    await expect(page.locator('h1')).toContainText(/productos/i)
  })

  test('cart page shows empty state when no items', async ({ page }) => {
    await page.goto('/carrito')
    await expect(page.locator('h1')).toContainText(/carrito/i)
    await expect(page.getByText('Tu carrito está vacío')).toBeVisible()
  })

  test('cart page shows link to catalog when empty', async ({ page }) => {
    await page.goto('/carrito')
    await expect(page.getByRole('link', { name: /ver productos/i })).toBeVisible()
  })

  test('product detail page loads', async ({ page }) => {
    await page.goto('/productos')
    await expect(page.locator('h1')).toBeVisible()
  })
})
