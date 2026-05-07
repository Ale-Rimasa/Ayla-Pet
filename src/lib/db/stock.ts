import { createAdminClient } from '@/lib/supabase/admin'

export async function decrementStock(
  items: Array<{ variantId: string; quantity: number }>
): Promise<{ ok: boolean; error?: string }> {
  if (items.length === 0) {
    return { ok: true }
  }

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
