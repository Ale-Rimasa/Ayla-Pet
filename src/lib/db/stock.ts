import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Tables } from '@/types/database'

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
    throw new Error(`getVariantsStock DB error: ${error?.message ?? 'no data'}`)
  }

  const stockMap: Record<string, number> = Object.fromEntries(
    variantIds.map((id) => [id, 0])
  )

  for (const row of data as Array<Pick<Tables<'product_variants'>, 'id' | 'stock'>>) {
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
    // Conservative failure: DB error blocks checkout to prevent overselling.
    // Trade-off: users see "out of stock" during Supabase outages. Acceptable
    // over the alternative (allowing purchases we can't fulfill).
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

  type VariantRow = Pick<Tables<'product_variants'>, 'id' | 'stock'> & {
    products: Pick<Tables<'products'>, 'name'> | null
  }

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

  // Service-role required: decrement_stock_batch RPC modifies data and must bypass RLS.
  // Single transactional call — any insufficient stock rolls back all decrements.
  const supabase = createAdminClient()

  const payload = items.map((i) => ({ variant_id: i.variantId, qty: i.quantity }))

  // Generated Supabase types can miss project-specific RPCs until db:types is run.
  const rpc = supabase.rpc as unknown as (
    fn: 'decrement_stock_batch',
    args: { p_items: typeof payload }
  ) => Promise<{ error: { message: string } | null }>
  const { error } = await rpc('decrement_stock_batch', { p_items: payload })

  if (error) {
    const match = error.message.match(/insufficient_stock_for_variant:(.+)/)
    if (match) {
      return { ok: false, error: `insufficient stock for variant ${match[1].trim()}` }
    }
    return { ok: false, error: error.message }
  }

  return { ok: true }
}
