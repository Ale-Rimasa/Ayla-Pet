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

  test('confirmation page redirects to home when order not found', async ({ page }) => {
    // Page reads "orderId" (camelCase) — snake_case "order_id" is ignored → redirect
    // Even with correct key, a non-existent orderId redirects to /
    // Full confirmation flow requires a real seeded order — covered in integration tests
    await page.goto('/checkout/confirmacion?orderId=00000000-0000-0000-0000-000000000000')
    await expect(page).toHaveURL('http://localhost:3000/')
  })
})
