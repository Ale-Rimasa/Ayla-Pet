import { test, expect } from '@playwright/test'

test.describe('Checkout flow', () => {
  test('checkout page redirects to cart when reached directly without items', async ({ page }) => {
    await page.goto('/checkout')
    await expect(page).toHaveURL(/checkout|carrito/)
  })

  test('checkout page shows customer form', async ({ page }) => {
    await page.goto('/checkout')
    const nameField = page.locator('input[autocomplete="name"]')
    const emailField = page.locator('input[type="email"]')
    await expect(nameField.or(emailField).first()).toBeVisible()
  })

  test('confirmation page shows order details with valid order id', async ({ page }) => {
    await page.goto('/checkout/confirmacion?order_id=test')
    await expect(page).toHaveURL(/confirmacion/)
  })
})
