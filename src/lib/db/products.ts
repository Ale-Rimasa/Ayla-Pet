import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Product, ProductVariant, GetProductsOptions, GetProductsResult } from '@/types'

type ProductRow = {
  id: string
  name: string
  slug: string
  description: string | null
  category_id: string
  images: string[]
  featured: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
}

type VariantRow = {
  id: string
  product_id: string
  name: string
  sku: string | null
  price: number
  stock: number
  sort_order: number
  created_at: string
  updated_at: string
}

function mapVariant(row: VariantRow): ProductVariant {
  return {
    id: row.id,
    productId: row.product_id,
    name: row.name,
    sku: row.sku ?? undefined,
    price: row.price,
    stock: row.stock,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapProduct(row: ProductRow, variants: VariantRow[] = []): Product {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? undefined,
    categoryId: row.category_id,
    images: row.images ?? [],
    featured: row.featured,
    variants: variants.map(mapVariant),
    deletedAt: row.deleted_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getProducts(opts: GetProductsOptions = {}): Promise<GetProductsResult> {
  const { categorySlug, page = 1, pageSize = 12 } = opts
  const supabase = await createClient()

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (categorySlug) {
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', categorySlug)
      .is('deleted_at', null)
      .maybeSingle()
    if (!category) return { data: [], count: 0, page, pageSize }
    query = query.eq('category_id', category.id)
  }

  const { data, count } = await query
  return {
    data: (data ?? []).map((row) => mapProduct(row as ProductRow)),
    count: count ?? 0,
    page,
    pageSize,
  }
}

export async function getProductBySlug(
  slug: string
): Promise<(Product & { variants: ProductVariant[] }) | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select('*, variants:product_variants(*)')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle()
  if (!data) return null
  const { variants: rawVariants, ...row } = data as ProductRow & { variants: VariantRow[] }
  return mapProduct(row, rawVariants ?? []) as Product & { variants: ProductVariant[] }
}

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('featured', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []).map((row) => mapProduct(row as ProductRow))
}

export interface GetProductsForAdminOptions {
  q?: string
  categoryId?: string
  page?: number
  pageSize?: number
}

export async function getProductSlugs(): Promise<string[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('products')
    .select('slug')
    .is('deleted_at', null)
  return (data ?? []).map((row) => (row as { slug: string }).slug)
}

export async function getProductsForAdmin(
  opts: GetProductsForAdminOptions = {}
): Promise<{ data: Product[]; count: number }> {
  const { q, categoryId, page = 1, pageSize = 20 } = opts
  const supabase = createAdminClient()

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('products')
    .select('*, variants:product_variants(*)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (q) {
    query = query.ilike('name', `%${q}%`)
  }

  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  const { data, count } = await query

  return {
    data: (data ?? []).map((row) => {
      const { variants: rawVariants, ...productRow } = row as ProductRow & {
        variants: VariantRow[]
      }
      return mapProduct(productRow, rawVariants ?? [])
    }),
    count: count ?? 0,
  }
}
