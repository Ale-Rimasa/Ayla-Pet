import { createClient } from '@/lib/supabase/server'
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
