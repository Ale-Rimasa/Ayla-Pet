'use server'

import { z } from 'zod'
import { revalidatePath, revalidateTag } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { uploadImage } from '@/lib/storage'
import {
  CreateProductSchema,
  UpdateProductSchema,
  CreateVariantSchema,
  UpdateVariantSchema,
} from '@/lib/validations'
import type {
  CreateProductInput,
  UpdateProductInput,
  CreateVariantInput,
  UpdateVariantInput,
} from '@/lib/validations'

const idSchema = z.string().uuid()

type VariantWithProduct = {
  product_id: string
  products: { slug: string } | null
} | null

export async function uploadProductImage(
  formData: FormData
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  await requireAdmin()
  const file = formData.get('file') as File | null
  if (!file) return { ok: false, error: 'missing_params' }

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
  if (!ALLOWED_TYPES.includes(file.type)) return { ok: false, error: 'invalid_file_type' }
  if (file.size > MAX_SIZE) return { ok: false, error: 'file_too_large' }

  // Generate path server-side — never accept client-provided storage paths.
  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const safePath = `${crypto.randomUUID()}.${ext}`
  return uploadImage('productos', safePath, file)
}

export async function createProduct(
  input: CreateProductInput
): Promise<{ ok: boolean; data?: { id: string }; error?: string }> {
  await requireAdmin()

  const parsed = CreateProductSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'validation_error' }
  }

  const supabase = createAdminClient()

  const { data: inserted, error } = await supabase
    .from('products')
    .insert(parsed.data)
    .select('id')
    .single()

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/admin/productos')
  revalidatePath('/productos')
  revalidateTag(`producto:${parsed.data.slug}`, {})

  return { ok: true, data: { id: inserted.id } }
}

export async function updateProduct(
  input: UpdateProductInput
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()

  const parsed = UpdateProductSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'validation_error' }
  }

  const { id, ...fields } = parsed.data

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('products')
    .update(fields)
    .eq('id', id)
    .is('deleted_at', null)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/admin/productos')
  revalidatePath('/productos')
  if (fields.slug) {
    revalidateTag(`producto:${fields.slug}`, {})
  }

  return { ok: true }
}

export async function softDeleteProduct(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()

  const parsed = idSchema.safeParse(id)
  if (!parsed.success) return { ok: false, error: 'invalid_id' }

  const supabase = createAdminClient()
  const now = new Date().toISOString()

  const { error: productError } = await supabase
    .from('products')
    .update({ deleted_at: now })
    .eq('id', parsed.data)
    .is('deleted_at', null)

  if (productError) {
    return { ok: false, error: productError.message }
  }

  const { error: variantError } = await supabase
    .from('product_variants')
    .update({ deleted_at: now })
    .eq('product_id', parsed.data)

  if (variantError) {
    return { ok: false, error: variantError.message }
  }

  revalidatePath('/admin/productos')
  revalidatePath('/productos')

  return { ok: true }
}

export async function restoreProduct(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()

  const parsed = idSchema.safeParse(id)
  if (!parsed.success) return { ok: false, error: 'invalid_id' }

  const supabase = createAdminClient()

  const { error: productError } = await supabase
    .from('products')
    .update({ deleted_at: null })
    .eq('id', parsed.data)

  if (productError) {
    return { ok: false, error: productError.message }
  }

  const { error: variantError } = await supabase
    .from('product_variants')
    .update({ deleted_at: null })
    .eq('product_id', parsed.data)

  if (variantError) {
    return { ok: false, error: variantError.message }
  }

  revalidatePath('/admin/productos')
  revalidatePath('/productos')

  return { ok: true }
}

export async function createVariant(
  input: CreateVariantInput
): Promise<{ ok: boolean; data?: { id: string }; error?: string }> {
  await requireAdmin()

  const parsed = CreateVariantSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'validation_error' }
  }

  const supabase = createAdminClient()

  const { data: product } = await supabase
    .from('products')
    .select('slug')
    .eq('id', parsed.data.product_id)
    .maybeSingle()

  const { data: inserted, error } = await supabase
    .from('product_variants')
    .insert(parsed.data)
    .select('id')
    .single()

  if (error) {
    return { ok: false, error: error.message }
  }

  if (product?.slug) {
    revalidateTag(`producto:${product.slug}`, {})
  }
  revalidatePath('/admin/productos')

  return { ok: true, data: { id: inserted.id } }
}

export async function updateVariant(
  input: UpdateVariantInput
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()

  const parsed = UpdateVariantSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'validation_error' }
  }

  const { id, ...fields } = parsed.data

  const supabase = createAdminClient()

  const { data: variant } = await supabase
    .from('product_variants')
    .select('product_id, products(slug)')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase
    .from('product_variants')
    .update(fields)
    .eq('id', id)

  if (error) {
    return { ok: false, error: error.message }
  }

  const slug = (variant as VariantWithProduct)?.products?.slug
  if (slug) {
    revalidateTag(`producto:${slug}`, {})
  }
  revalidatePath('/admin/productos')

  return { ok: true }
}

export async function deleteVariant(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()

  const parsed = idSchema.safeParse(id)
  if (!parsed.success) return { ok: false, error: 'invalid_id' }

  const supabase = createAdminClient()

  const { data: variant } = await supabase
    .from('product_variants')
    .select('product_id, products(slug)')
    .eq('id', parsed.data)
    .maybeSingle()

  const { error } = await supabase
    .from('product_variants')
    .delete()
    .eq('id', parsed.data)

  if (error) {
    return { ok: false, error: error.message }
  }

  const slug = (variant as VariantWithProduct)?.products?.slug
  if (slug) {
    revalidateTag(`producto:${slug}`, {})
  }
  revalidatePath('/admin/productos')

  return { ok: true }
}

const MAX_IMAGES_PER_PRODUCT = 8

export async function createProductImage(input: {
  productId: string
  url: string
  alt?: string
  label?: string
  sortOrder: number
}): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('product_images')
    .select('id')
    .eq('product_id', input.productId)

  if (Array.isArray(existing) && existing.length >= MAX_IMAGES_PER_PRODUCT) {
    return { ok: false, error: 'max_images_reached' }
  }

  const { data, error } = await supabase
    .from('product_images')
    .insert({
      product_id: input.productId,
      url: input.url,
      alt: input.alt ?? null,
      label: input.label ?? null,
      sort_order: input.sortOrder,
    })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data }
}

export async function deleteProductImage(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()

  const parsed = idSchema.safeParse(id)
  if (!parsed.success) return { ok: false, error: 'invalid_id' }

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('product_images')
    .delete()
    .eq('id', parsed.data)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function updateProductImage(input: {
  id: string
  alt?: string
  label?: string
}): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()
  const supabase = createAdminClient()

  const updates: { alt?: string | null; label?: string | null } = {}
  if (input.alt !== undefined) updates.alt = input.alt || null
  if (input.label !== undefined) updates.label = input.label || null

  const { error } = await supabase
    .from('product_images')
    .update(updates)
    .eq('id', input.id)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function reorderProductImages(
  productId: string,
  imageIds: string[]
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()
  if (imageIds.length === 0) return { ok: true }

  const supabase = createAdminClient()

  const updates = imageIds.map((id, index) =>
    supabase
      .from('product_images')
      .update({ sort_order: index })
      .eq('id', id)
      .eq('product_id', productId)
  )

  const results = await Promise.all(updates)
  const failed = results.find((r) => r.error)
  if (failed?.error) return { ok: false, error: (failed.error as { message: string }).message }

  revalidatePath('/admin/productos')
  revalidatePath('/productos')

  return { ok: true }
}
