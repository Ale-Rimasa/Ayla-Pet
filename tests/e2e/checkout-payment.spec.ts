/**
 * E2E — Checkout Pro con MercadoPago sandbox
 *
 * Cómo usar:
 *   pnpm test:e2e tests/e2e/checkout-payment.spec.ts
 *   pnpm test:e2e tests/e2e/checkout-payment.spec.ts --headed   (ver el browser)
 *
 * Para cambiar escenario: modificá ACTIVE_CARD abajo.
 * Para ver qué pasa: --headed + --slow-mo 500
 */

import { test, expect, type Page } from '@playwright/test'

// ─── PARÁMETROS — editá esto ─────────────────────────────────────────────────

/**
 * Credenciales del COMPRADOR de prueba.
 * Crealo en: https://www.mercadopago.com.ar/developers/panel/test-users
 * Necesitás un usuario con rol "comprador" (distinto del vendedor que tiene el access token).
 */
const MP_BUYER = {
  email: 'TU_BUYER_TEST_EMAIL@testuser.com',
  password: 'TU_BUYER_TEST_PASSWORD',
}

/** Datos del formulario de checkout (el nuestro, no el de MP). */
const CHECKOUT_FORM = {
  name: 'Ana García',
  email: 'ana@test.com',
  phone: '1112345678',
  street: 'Av. Corrientes 1234',
  city: 'Buenos Aires',
  postalCode: '1043',
  province: 'Buenos Aires', // debe coincidir con una opción del select
}

/**
 * Tarjetas de prueba — MercadoPago Argentina.
 * El nombre del titular define el resultado, no el número.
 * Ref: https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/your-integrations/test
 */
const CARDS = {
  approved: {
    number: '5031 7557 3453 0604',
    expiry: '11/30',
    cvv: '123',
    holderName: 'APRO',       // → status: approved
  },
  rejected: {
    number: '3743 781877 55283',
    expiry: '11/30',
    cvv: '1234',
    holderName: 'CONT',       // → status: rejected (cc_rejected_call_for_authorize)
  },
  pending: {
    number: '4013 0777 6090 0435',
    expiry: '11/30',
    cvv: '123',
    holderName: 'PEND',       // → status: in_process
  },
}

// ← CAMBIÁ ESTO para el escenario que querés probar
const ACTIVE_CARD = CARDS.rejected

// ─── TEST ─────────────────────────────────────────────────────────────────────

test.describe('Checkout Pro — flujo completo', () => {
  test.setTimeout(120_000) // MP sandbox es lento, 2 min de margen

  test(`pago con tarjeta "${ACTIVE_CARD.holderName}"`, async ({ page }) => {
    // 1. Inyectar un item en el carrito via localStorage (evita navegar la tienda)
    await seedCart(page)

    // 2. Ir al checkout
    await page.goto('/checkout')
    await expect(page).toHaveURL(/checkout/)

    // 3. Llenar el formulario
    await fillCheckoutForm(page)

    // 4. Seleccionar MercadoPago
    const mpRadio = page.getByRole('radio', { name: /mercadopago/i })
    if (await mpRadio.isVisible()) await mpRadio.click()

    // 5. Enviar pedido
    await page.getByRole('button', { name: /confirmar|pagar/i }).click()

    // 6. Esperar redirect a MP sandbox
    await page.waitForURL(/sandbox\.mercadopago|mercadopago\.com/, { timeout: 30_000 })

    // 7. Completar el pago en MP
    await completeMPPayment(page)

    // 8. Esperar redirect de vuelta a nuestro sitio
    await page.waitForURL(/checkout\/confirmacion/, { timeout: 60_000 })

    // 9. Validar UI según escenario
    await assertConfirmationPage(page)
  })
})

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Inyecta un CartItem directamente en el localStorage de Zustand.
 * Necesitás reemplazar variantId y el resto con datos reales de tu DB.
 * Podés obtenerlo desde el admin → Productos → copiar el ID de la variante.
 */
async function seedCart(page: Page) {
  await page.goto('/')
  await page.evaluate(() => {
    const cartItem = {
      id: 'item-test-1',
      variantId: 'REEMPLAZAR_CON_VARIANT_ID_REAL',  // ← UUID de una variante real en tu DB
      name: 'Chapa personalizada — Mediana',
      price: 500000, // centavos ARS (= $5000)
      quantity: 1,
      imageUrl: '',
    }
    localStorage.setItem(
      'pet-laser-cart-v1',
      JSON.stringify({ state: { items: [cartItem] }, version: 0 })
    )
  })
  await page.reload()
}

async function fillCheckoutForm(page: Page) {
  // Datos personales
  await page.getByLabel(/nombre/i).fill(CHECKOUT_FORM.name)
  await page.getByLabel(/email/i).fill(CHECKOUT_FORM.email)
  await page.getByLabel(/tel[eé]fono/i).fill(CHECKOUT_FORM.phone)

  // Dirección
  await page.getByLabel(/direcci[oó]n|calle/i).fill(CHECKOUT_FORM.street)
  await page.getByLabel(/ciudad/i).fill(CHECKOUT_FORM.city)
  await page.getByLabel(/c[oó]digo postal/i).fill(CHECKOUT_FORM.postalCode)

  // Provincia — Select
  const provinceSelect = page.getByRole('combobox', { name: /provincia/i })
  if (await provinceSelect.isVisible()) {
    await provinceSelect.click()
    await page.getByRole('option', { name: CHECKOUT_FORM.province }).click()
  }

  // Esperar que el cotizador de envío resuelva
  await page.waitForTimeout(2000)
}

/**
 * Navega por el flujo de pago en el sandbox de MP.
 *
 * NOTA: Los selectores del sandbox de MP pueden cambiar sin previo aviso.
 * Si algún paso falla, abrí el browser con --headed, inspeccioná el elemento
 * y actualizá el selector correspondiente.
 */
async function completeMPPayment(page: Page) {
  // Paso 1: email del comprador
  const emailInput = page.locator('input[name="user_id"], #user_id, [data-testid="login-email"], input[type="email"]').first()
  await emailInput.waitFor({ timeout: 15_000 })
  await emailInput.fill(MP_BUYER.email)
  await page.keyboard.press('Enter')

  // Paso 2: password
  const passwordInput = page.locator('input[name="password"], #password, [data-testid="login-password"], input[type="password"]').first()
  await passwordInput.waitFor({ timeout: 10_000 })
  await passwordInput.fill(MP_BUYER.password)
  await page.keyboard.press('Enter')

  // Paso 3: esperar que cargue la pantalla de pago
  await page.waitForTimeout(3000)

  // Paso 4: puede aparecer un botón "Pagar con tarjeta de crédito/débito"
  const creditCardBtn = page.getByRole('button', { name: /tarjeta.*cr[eé]dito|cr[eé]dito|d[eé]bito/i })
  if (await creditCardBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await creditCardBtn.click()
    await page.waitForTimeout(1500)
  }

  // Paso 5: número de tarjeta
  const cardNumberInput = page.locator('#cardNumber, [data-testid="card-number"], input[placeholder*="número"], input[placeholder*="card"]').first()
  await cardNumberInput.waitFor({ timeout: 10_000 })
  await cardNumberInput.fill(ACTIVE_CARD.number)

  // Paso 6: vencimiento
  await page.locator('#cardExpirationDate, [data-testid="expiration-date"], input[placeholder*="MM"]').first().fill(ACTIVE_CARD.expiry)

  // Paso 7: CVV
  await page.locator('#securityCode, [data-testid="security-code"], input[placeholder*="CVV"], input[placeholder*="cód"]').first().fill(ACTIVE_CARD.cvv)

  // Paso 8: nombre del titular
  await page.locator('#cardholderName, [data-testid="cardholder-name"], input[placeholder*="titular"]').first().fill(ACTIVE_CARD.holderName)

  // Paso 9: pagar
  await page.getByRole('button', { name: /pagar|pay/i }).last().click()
}

async function assertConfirmationPage(page: Page) {
  if (ACTIVE_CARD === CARDS.approved) {
    await expect(page.getByRole('heading', { name: '¡Pago aprobado!' })).toBeVisible({ timeout: 15_000 })
  } else if (ACTIVE_CARD === CARDS.rejected) {
    await expect(page.getByRole('heading', { name: 'Pago rechazado' })).toBeVisible({ timeout: 15_000 })
  } else {
    await expect(page.getByRole('heading', { name: 'Pago en proceso' })).toBeVisible({ timeout: 15_000 })
  }
}
