'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { uploadImage } from '@/lib/storage'
import { CreateCategorySchema, UpdateCategorySchema } from '@/lib/validations'
import type { CreateCategoryInput, UpdateCategoryInput } from '@/lib/validations'

const idSchema = z.string().uuid()

export async function uploadCategoryImage(
  formData: FormData
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  await requireAdmin()
  const file = formData.get('file') as File | null
  const path = formData.get('path') as string | null
  if (!file || !path) return { ok: false, error: 'missing_params' }
  return uploadImage('categorias', path, file)
}

export async function createCategory(
  input: CreateCategoryInput
): Promise<{ ok: boolean; data?: { id: string }; error?: string }> {
  await requireAdmin()

  const parsed = CreateCategorySchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'validation_error' }
  }

  const supabase = createAdminClient()

  const { data: inserted, error } = await supabase
    .from('categories')
    .insert(parsed.data)
    .select('id')
    .single()

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/admin/categorias')
  revalidatePath('/categorias')
  revalidatePath('/productos')

  return { ok: true, data: { id: inserted.id } }
}

export async function updateCategory(
  input: UpdateCategoryInput
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()

  const parsed = UpdateCategorySchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'validation_error' }
  }

  const { id, ...fields } = parsed.data

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('categories')
    .update(fields)
    .eq('id', id)
    .is('deleted_at', null)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/admin/categorias')
  revalidatePath('/categorias')
  revalidatePath('/productos')

  return { ok: true }
}

export async function softDeleteCategory(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()

  const parsed = idSchema.safeParse(id)
  if (!parsed.success) return { ok: false, error: 'invalid_id' }

  const supabase = createAdminClient()

  const { data: activeProducts } = await supabase
    .from('products')
    .select('id')
    .eq('category_id', parsed.data)
    .is('deleted_at', null)
    .limit(1)

  if (activeProducts && activeProducts.length > 0) {
    return { ok: false, error: 'category_has_products' }
  }

  const { error } = await supabase
    .from('categories')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', parsed.data)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/admin/categorias')
  revalidatePath('/categorias')
  revalidatePath('/productos')

  return { ok: true }
}
