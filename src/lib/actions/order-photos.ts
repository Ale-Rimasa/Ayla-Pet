'use server'

import { z } from 'zod'
import { revalidateTag } from 'next/cache'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth'
import { uploadImage, deleteImage } from '@/lib/storage'
import { checkRateLimit } from '@/lib/rate-limit'
import { ORDER_STATUS } from '@/lib/constants'
import type { OrderReferencePhotoForClient } from '@/types'

const BUCKET = 'order-photos'
const MAX_SIZE = 5 * 1024 * 1024 // 5,242,880 bytes
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const
const SIGNED_URL_TTL_SECONDS = 3600

// Órdenes que aceptan fotos de referencia (capability-URL pattern:
// el orderId UUID actúa como token de acceso — service-role necesario
// porque el cliente final no tiene sesión autenticada en esta etapa).
const VALID_STATUSES = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.PAID,
  ORDER_STATUS.PROCESSING,
] as const

type ErrorCode =
  | 'ORDER_NOT_FOUND'
  | 'ORDER_NOT_PAYABLE'
  | 'PHOTO_LIMIT_REACHED'
  | 'INVALID_MIME_TYPE'
  | 'FILE_TOO_LARGE'
  | 'PHOTO_NOT_FOUND'
  | 'STORAGE_UPLOAD_FAILED'
  | 'STORAGE_DELETE_FAILED'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: ErrorCode }

const OrderIdSchema = z.string().uuid()
const PhotoIdSchema = z.string().uuid()

function mimeToExt(mime: string): string {
  switch (mime) {
    case 'image/jpeg': return 'jpg'
    case 'image/png':  return 'png'
    case 'image/webp': return 'webp'
    case 'image/avif': return 'avif'
    default:           return 'bin'
  }
}

async function getClientIp(): Promise<string> {
  const h = await headers()
  return h.get('x-forwarded-for') ?? '0.0.0.0'
}

// ─── uploadOrderReferencePhoto ─────────────────────────────────────────────

export async function uploadOrderReferencePhoto(
  formData: FormData
): Promise<ActionResult<{ id: string; storagePath: string; displayOrder: number }>> {
  const orderId = formData.get('orderId')
  const file = formData.get('file')

  if (!OrderIdSchema.safeParse(orderId).success || !(file instanceof File)) {
    return { ok: false, error: 'ORDER_NOT_FOUND' }
  }

  const ip = await getClientIp()
  const allowed = await checkRateLimit(`order-photo-upload:${ip}`, 10, 60_000)
  if (!allowed) return { ok: false, error: 'RATE_LIMITED' }

  const supabase = createAdminClient()

  const { data: order } = await supabase
    .from('orders')
    .select('id, status')
    .eq('id', orderId as string)
    .maybeSingle()

  if (!order) return { ok: false, error: 'ORDER_NOT_FOUND' }

  if (!(VALID_STATUSES as readonly string[]).includes(order.status)) {
    return { ok: false, error: 'ORDER_NOT_PAYABLE' }
  }

  if (!ALLOWED_MIME.includes(file.type as (typeof ALLOWED_MIME)[number])) {
    return { ok: false, error: 'INVALID_MIME_TYPE' }
  }

  if (file.size > MAX_SIZE || file.size === 0) {
    return { ok: false, error: 'FILE_TOO_LARGE' }
  }

  const { count } = await supabase
    .from('order_reference_photos')
    .select('id', { count: 'exact', head: true })
    .eq('order_id', orderId as string)

  const currentCount = count ?? 0
  if (currentCount >= 3) return { ok: false, error: 'PHOTO_LIMIT_REACHED' }

  const ext = mimeToExt(file.type)
  const safePath = `${orderId}/${crypto.randomUUID()}.${ext}`

  const uploadResult = await uploadImage(BUCKET, safePath, file)
  if (!uploadResult.ok) return { ok: false, error: 'STORAGE_UPLOAD_FAILED' }

  const { data: inserted, error: insertError } = await supabase
    .from('order_reference_photos')
    .insert({
      order_id: orderId as string,
      storage_path: safePath,
      display_order: currentCount,
      mime_type: file.type,
      size_bytes: file.size,
    })
    .select('id, storage_path, display_order')
    .single()

  if (insertError) {
    await deleteImage(BUCKET, safePath)
    // '23514' = check_violation — trigger PHOTO_LIMIT_REACHED (race condition)
    if (insertError.code === '23514' || insertError.message?.includes('PHOTO_LIMIT_REACHED')) {
      return { ok: false, error: 'PHOTO_LIMIT_REACHED' }
    }
    return { ok: false, error: 'INTERNAL_ERROR' }
  }

  revalidateTag(`order-photos:${orderId}`, {})

  return {
    ok: true,
    data: {
      id: inserted.id,
      storagePath: inserted.storage_path,
      displayOrder: inserted.display_order,
    },
  }
}

// ─── deleteOrderReferencePhoto ─────────────────────────────────────────────

export async function deleteOrderReferencePhoto(
  photoId: string,
  orderId: string
): Promise<ActionResult<{ deleted: true }>> {
  if (!PhotoIdSchema.safeParse(photoId).success || !OrderIdSchema.safeParse(orderId).success) {
    return { ok: false, error: 'PHOTO_NOT_FOUND' }
  }

  const supabase = createAdminClient()

  const { data: order } = await supabase
    .from('orders')
    .select('id, status')
    .eq('id', orderId)
    .maybeSingle()

  if (!order) return { ok: false, error: 'ORDER_NOT_FOUND' }

  if (!(VALID_STATUSES as readonly string[]).includes(order.status)) {
    return { ok: false, error: 'ORDER_NOT_PAYABLE' }
  }

  const { data: photo } = await supabase
    .from('order_reference_photos')
    .select('id, order_id, storage_path')
    .eq('id', photoId)
    .eq('order_id', orderId)
    .maybeSingle()

  if (!photo) return { ok: false, error: 'PHOTO_NOT_FOUND' }

  const storageResult = await deleteImage(BUCKET, photo.storage_path)
  if (!storageResult.ok) return { ok: false, error: 'STORAGE_DELETE_FAILED' }

  await supabase
    .from('order_reference_photos')
    .delete()
    .eq('id', photoId)
    .eq('order_id', orderId)

  revalidateTag(`order-photos:${orderId}`, {})

  return { ok: true, data: { deleted: true } }
}

// ─── getOrderReferencePhotos ───────────────────────────────────────────────

export async function getOrderReferencePhotos(
  orderId: string
): Promise<ActionResult<OrderReferencePhotoForClient[]>> {
  if (!OrderIdSchema.safeParse(orderId).success) {
    return { ok: false, error: 'ORDER_NOT_FOUND' }
  }

  const ip = await getClientIp()
  const allowed = await checkRateLimit(`order-photo-list:${ip}`, 30, 60_000)
  if (!allowed) return { ok: false, error: 'RATE_LIMITED' }

  const supabase = createAdminClient()

  const { data: order } = await supabase
    .from('orders')
    .select('id, status')
    .eq('id', orderId)
    .maybeSingle()

  if (!order) return { ok: false, error: 'ORDER_NOT_FOUND' }

  const { data: rows } = await supabase
    .from('order_reference_photos')
    .select('id, order_id, display_order, mime_type, size_bytes, created_at')
    .eq('order_id', orderId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })

  const photos: OrderReferencePhotoForClient[] = (rows ?? []).map((row) => ({
    id: row.id,
    orderId: row.order_id,
    displayOrder: row.display_order,
    mimeType: row.mime_type as OrderReferencePhotoForClient['mimeType'],
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  }))

  return { ok: true, data: photos }
}

// ─── getSignedPhotoUrls (admin) ────────────────────────────────────────────

export async function getSignedPhotoUrls(
  orderId: string
): Promise<ActionResult<Array<{ id: string; signedUrl: string; expiresAt: string }>>> {
  await requireAdmin()

  if (!OrderIdSchema.safeParse(orderId).success) {
    return { ok: false, error: 'ORDER_NOT_FOUND' }
  }

  const supabase = createAdminClient()

  const { data: photos } = await supabase
    .from('order_reference_photos')
    .select('id, storage_path')
    .eq('order_id', orderId)
    .order('display_order', { ascending: true })

  const signed = await Promise.all(
    (photos ?? []).map(async (p) => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(p.storage_path, SIGNED_URL_TTL_SECONDS)
      if (error || !data) return null
      return {
        id: p.id,
        signedUrl: data.signedUrl,
        expiresAt: new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString(),
      }
    })
  )

  return {
    ok: true,
    data: signed.filter((s): s is NonNullable<typeof s> => s !== null),
  }
}

// ─── getSignedPhotoUrlsForOwner (capability token) ─────────────────────────

export async function getSignedPhotoUrlsForOwner(
  orderId: string
): Promise<ActionResult<Array<{ id: string; signedUrl: string; displayOrder: number }>>> {
  if (!OrderIdSchema.safeParse(orderId).success) {
    return { ok: false, error: 'ORDER_NOT_FOUND' }
  }

  const ip = await getClientIp()
  const allowed = await checkRateLimit(`order-photo-signed:${ip}`, 30, 60_000)
  if (!allowed) return { ok: false, error: 'RATE_LIMITED' }

  const supabase = createAdminClient()

  const { data: order } = await supabase
    .from('orders')
    .select('id, status')
    .eq('id', orderId)
    .maybeSingle()

  if (!order) return { ok: false, error: 'ORDER_NOT_FOUND' }

  const { data: photos } = await supabase
    .from('order_reference_photos')
    .select('id, storage_path, display_order')
    .eq('order_id', orderId)
    .order('display_order', { ascending: true })

  const signed = await Promise.all(
    (photos ?? []).map(async (p) => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(p.storage_path, SIGNED_URL_TTL_SECONDS)
      if (error || !data) return null
      return {
        id: p.id,
        signedUrl: data.signedUrl,
        displayOrder: p.display_order,
      }
    })
  )

  return {
    ok: true,
    data: signed.filter((s): s is NonNullable<typeof s> => s !== null),
  }
}
