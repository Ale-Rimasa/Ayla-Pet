'use server'

import { z } from 'zod'
import { CartItemsSchema } from '@/lib/validations'
import { getVariantsStock, validateCartStock } from '@/lib/db/stock'
import type { ItemStockError } from '@/lib/db/stock'

// Lightweight shape guard — Zod validates the outer array; regex filters per-UUID
const RawIdsSchema = z.array(z.string()).max(100)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ─── getVariantsStockAction ──────────────────────────────────────────────────
// Lightweight Zod: shape + size guard, then filter valid UUIDs, dedup, cap at 50

export async function getVariantsStockAction(
  variantIds: unknown
): Promise<Record<string, number>> {
  const parsed = RawIdsSchema.safeParse(variantIds)
  if (!parsed.success) return {}

  const valid = [...new Set(parsed.data.filter((id) => UUID_RE.test(id)))].slice(0, 50)

  if (valid.length === 0) return {}

  return getVariantsStock(valid)
}

// ─── validateCartBeforeCheckout ──────────────────────────────────────────────
// Strong validation: Zod CartItemsSchema + validateCartStock

export async function validateCartBeforeCheckout(
  items: Array<{ variantId: string; quantity: number }>
): Promise<{ ok: true } | { ok: false; errors: ItemStockError[] }> {
  const parsed = CartItemsSchema.safeParse(items)

  if (!parsed.success) {
    return {
      ok: false,
      errors: [],
    }
  }

  return validateCartStock(parsed.data)
}
