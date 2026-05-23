import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth'
import type { Product, ProductImage, ProductVariant, GetProductsOptions, GetProductsResult } from '@/types'

type ProductRow = {
  id: string
  name: string
  slug: string
  description: string | null
  category_id: string
  images?: string[]
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

type ProductImageRow = {
  id: string
  product_id: string
  url: string
  alt: string | null
  label: string | null
  sort_order: number
  created_at: string
}

export function mapProductImage(row: ProductImageRow): ProductImage {
  return {
    id: row.id,
    productId: row.product_id,
    url: row.url,
    alt: row.alt ?? undefined,
    label: row.label ?? undefined,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  }
}

export function getMainImage(images: ProductImage[]): string | undefined {
  return images[0]?.url
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

function mapProduct(row: ProductRow, variants: VariantRow[] = [], images: ProductImageRow[] = []): Product {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? undefined,
    categoryId: row.category_id,
    images: images.sort((a, b) => a.sort_order - b.sort_order).map(mapProductImage),
    featured: row.featured,
    variants: variants.map(mapVariant),
    deletedAt: row.deleted_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getProducts(opts: GetProductsOptions = {}): Promise<GetProductsResult> {
  const { q, categorySlug, page = 1, pageSize = 12 } = opts
  const supabase = await createClient()

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('products')
    .select('*, images:product_images(*)', { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (q) {
    const safe = q.slice(0, 100).replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
    query = query.ilike('name', `%${safe}%`)
  }

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
    data: (data ?? []).map((row) => {
      const { images: rawImages, ...productRow } = row as ProductRow & { images: ProductImageRow[] }
      return mapProduct(productRow, [], rawImages ?? [])
    }),
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
    .select('*, variants:product_variants(*), images:product_images(*)')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle()
  if (!data) return null
  const { variants: rawVariants, images: rawImages, ...row } = data as ProductRow & {
    variants: VariantRow[]
    images: ProductImageRow[]
  }
  return mapProduct(row, rawVariants ?? [], rawImages ?? []) as Product & { variants: ProductVariant[] }
}

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select('*, images:product_images(*)')
    .eq('featured', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []).map((row) => {
    const { images: rawImages, ...productRow } = row as ProductRow & { images: ProductImageRow[] }
    return mapProduct(productRow, [], rawImages ?? [])
  })
}

export interface GetProductsForAdminOptions {
  q?: string
  categoryId?: string
  page?: number
  pageSize?: number
}

export async function getProductSlugs(): Promise<string[]> {
  // Must use admin client: called from generateStaticParams at build time (no HTTP request/cookies available)
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
  await requireAdmin()
  const { q, categoryId, page = 1, pageSize = 20 } = opts
  const supabase = createAdminClient()

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('products')
    .select('*, variants:product_variants(*), images:product_images(*)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (q) {
    const safe = q.slice(0, 100).replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
    query = query.ilike('name', `%${safe}%`)
  }

  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  const { data, count } = await query

  return {
    data: (data ?? []).map((row) => {
      const { variants: rawVariants, images: rawImages, ...productRow } = row as ProductRow & {
        variants: VariantRow[]
        images: ProductImageRow[]
      }
      return mapProduct(productRow, rawVariants ?? [], rawImages ?? [])
    }),
    count: count ?? 0,
  }
}

/**
 * Cached version for nav use only (no filters, pageSize 100).
 * React.cache deduplicates per-request — ProductsMenu y MobileNavWrapper
 * comparten el resultado sin hacer dos queries a Supabase.
 */
export const getNavProducts = cache(() => getProducts({ pageSize: 100 }))
