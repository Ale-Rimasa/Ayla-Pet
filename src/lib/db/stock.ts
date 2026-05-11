import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ─── Types ───────────────────────────────────────────────────────────────────

export type ItemStockError = {
  variantId: string
  productName: string
  requested: number
  available: number
}

export type ValidateCartStockResult = { ok: true } | { ok: false; errors: ItemStockError[] }

// ─── getVariantsStock ────────────────────────────────────────────────────────

export async function getVariantsStock(
  variantIds: string[]
): Promise<Record<string, number>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('product_variants')
    .select('id, stock')
    .in('id', variantIds)

  if (error || !data) {
    // Return 0 for all requested ids on error
    return Object.fromEntries(variantIds.map((id) => [id, 0]))
  }

  const stockMap: Record<string, number> = Object.fromEntries(
    variantIds.map((id) => [id, 0])
  )

  for (const row of data as Array<{ id: string; stock: number }>) {
    stockMap[row.id] = row.stock
  }

  return stockMap
}

// ─── validateCartStock ───────────────────────────────────────────────────────

export async function validateCartStock(
  items: Array<{ variantId: string; quantity: number }>
): Promise<ValidateCartStockResult> {
  const supabase = await createClient()

  const variantIds = items.map((i) => i.variantId)

  const { data, error } = await supabase
    .from('product_variants')
    .select('id, stock, products(name)')
    .in('id', variantIds)

  if (error || !data) {
    return {
      ok: false,
      errors: items.map((i) => ({
        variantId: i.variantId,
        productName: 'unknown',
        requested: i.quantity,
        available: 0,
      })),
    }
  }

  type VariantRow = { id: string; stock: number; products: { name: string } | null }

  const rowMap = new Map<string, VariantRow>()
  for (const row of data as VariantRow[]) {
    rowMap.set(row.id, row)
  }

  const errors: ItemStockError[] = []

  for (const item of items) {
    const row = rowMap.get(item.variantId)
    const available = row?.stock ?? 0

    if (available < item.quantity) {
      errors.push({
        variantId: item.variantId,
        productName: row?.products?.name ?? 'unknown',
        requested: item.quantity,
        available,
      })
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  return { ok: true }
}

// ─── decrementStock ──────────────────────────────────────────────────────────

export async function decrementStock(
  items: Array<{ variantId: string; quantity: number }>
): Promise<{ ok: boolean; error?: string }> {
  if (items.length === 0) {
    return { ok: true }
  }

  // Service-role required: decrement_stock RPC modifies data and must bypass RLS
  const supabase = createAdminClient()

  for (const item of items) {
    const { data, error } = await supabase.rpc('decrement_stock', {
      p_variant_id: item.variantId,
      p_qty: item.quantity,
    })

    if (error) {
      return { ok: false, error: error.message }
    }

    const rows = data as unknown[]
    if (!rows || rows.length === 0) {
      return { ok: false, error: `insufficient stock for variant ${item.variantId}` }
    }
  }

  return { ok: true }
}
