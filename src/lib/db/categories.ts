import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth'
import type { Category } from '@/types'

function mapCategory(row: {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  sort_order: number
  deleted_at: string | null
}): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    imageUrl: row.image_url ?? undefined,
    sortOrder: row.sort_order,
    deletedAt: row.deleted_at ?? undefined,
  }
}

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('categories')
    .select('*')
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
  return (data ?? []).map(mapCategory)
}

export async function getCategoriesForAdmin(
  opts: { includeDeleted?: boolean } = {}
): Promise<Category[]> {
  // Defense-in-depth: this function uses service-role and returns soft-deleted
  // rows — require admin session even if the caller already checked.
  await requireAdmin()
  // Service-role required: bypasses RLS to include soft-deleted categories.
  const supabase = createAdminClient()

  let query = supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })

  if (!opts.includeDeleted) {
    query = query.is('deleted_at', null)
  }

  const { data } = await query
  return (data ?? []).map(mapCategory)
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle()
  return data ? mapCategory(data) : null
}
