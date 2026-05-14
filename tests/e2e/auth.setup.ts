/**
 * Auth setup for Playwright authenticated tests.
 * Saves admin session to .playwright/auth.json for reuse.
 *
 * Usage:
 *   TEST_ADMIN_EMAIL=admin@example.com TEST_ADMIN_PASSWORD=... pnpm test:e2e --project=setup
 *
 * The saved storageState is consumed by admin-authenticated.spec.ts.
 * This file is skipped automatically if env vars are absent.
 */

import { test as setup, expect } from '@playwright/test'
import path from 'path'

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD
export const STORAGE_STATE = path.join(process.cwd(), '.playwright/auth.json')

setup('authenticate admin', async ({ page }) => {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    setup.skip()
    return
  }

  await page.goto('/admin/login')
  await page.fill('input[type="email"]', ADMIN_EMAIL)
  await page.fill('input[type="password"]', ADMIN_PASSWORD)
  await page.click('button[type="submit"]')

  await expect(page).toHaveURL(/\/admin(?!\/login)/, { timeout: 10_000 })

  await page.context().storageState({ path: STORAGE_STATE })
})
