'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { uploadImage, deleteImage } from '@/lib/storage'
import {
  getHeroConfig,
  getBrandingConfig,
  upsertSetting,
} from '@/lib/db/site-settings'
import {
  HeroCopySchema,
  StoreInfoSchema,
  TransferSchema,
  MaintenanceSchema,
  HeroImageFileSchema,
  LogoFileSchema,
  DeleteHeroImageSchema,
  ReorderHeroImagesSchema,
  MAX_HERO_IMAGES,
} from '@/lib/validations/settings'
import type { HeroImage } from '@/types/settings'

type Result = { ok: true } | { ok: false; error: string }

// ─── Hero copy (title / subtitle) ────────────────────────────────────────────

export async function updateHeroCopy(input: {
  title: string
  subtitle: string
}): Promise<Result> {
  await requireAdmin()
  const parsed = HeroCopySchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'validation_error' }
  const current = await getHeroConfig()
  const res = await upsertSetting('hero', { ...current, ...parsed.data })
  if (res.ok) revalidatePath('/')
  return res
}

// ─── Hero images ──────────────────────────────────────────────────────────────

export async function uploadHeroImage(
  formData: FormData,
): Promise<{ ok: true; image: HeroImage } | { ok: false; error: string }> {
  await requireAdmin()

  const file = formData.get('file') as File | null
  if (!file) return { ok: false, error: 'missing_params' }
  const fileCheck = HeroImageFileSchema.safeParse({ type: file.type, size: file.size })
  if (!fileCheck.success) {
    const issue = fileCheck.error.issues[0]
    return { ok: false, error: issue?.path[0] === 'size' ? 'file_too_large' : 'invalid_file_type' }
  }

  const current = await getHeroConfig()
  if (current.images.length >= MAX_HERO_IMAGES)
    return { ok: false, error: 'max_images_reached' }

  const ext =
    (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const safePath = `${crypto.randomUUID()}.${ext}`

  const up = await uploadImage('hero', safePath, file)
  if (!up.ok) return { ok: false, error: up.error }

  const image: HeroImage = { url: up.url, sortOrder: current.images.length }
  const next = { ...current, images: [...current.images, image] }
  const res = await upsertSetting('hero', next)
  if (!res.ok) return res

  revalidatePath('/')
  return { ok: true, image }
}

export async function deleteHeroImage(
  imageUrl: string,
  imagePath: string,
): Promise<Result> {
  await requireAdmin()
  const parsed = DeleteHeroImageSchema.safeParse({ imageUrl, imagePath })
  if (!parsed.success) return { ok: false, error: 'validation_error' }

  const current = await getHeroConfig()
  const remaining = current.images
    .filter((i) => i.url !== imageUrl)
    .map((i, idx) => ({ ...i, sortOrder: idx }))

  const res = await upsertSetting('hero', { ...current, images: remaining })
  if (!res.ok) return res

  // best-effort storage delete
  if (imagePath) await deleteImage('hero', imagePath)

  revalidatePath('/')
  return { ok: true }
}

export async function reorderHeroImages(orderedUrls: string[]): Promise<Result> {
  await requireAdmin()
  const parsed = ReorderHeroImagesSchema.safeParse({ orderedUrls })
  if (!parsed.success) return { ok: false, error: 'validation_error' }

  const current = await getHeroConfig()
  const byUrl = new Map(current.images.map((i) => [i.url, i]))
  const reordered: HeroImage[] = orderedUrls
    .map((url, idx) => {
      const img = byUrl.get(url)
      return img ? { ...img, sortOrder: idx } : null
    })
    .filter((x): x is HeroImage => x !== null)

  const res = await upsertSetting('hero', { ...current, images: reordered })
  if (res.ok) revalidatePath('/')
  return res
}

// ─── Store info ───────────────────────────────────────────────────────────────

export async function updateStoreInfo(input: unknown): Promise<Result> {
  await requireAdmin()
  const parsed = StoreInfoSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'validation_error' }
  const res = await upsertSetting('store_info', parsed.data)
  if (res.ok) {
    revalidatePath('/')
    revalidatePath('/admin/configuracion')
  }
  return res
}

// ─── Transfer info ────────────────────────────────────────────────────────────

export async function updateTransferInfo(input: unknown): Promise<Result> {
  await requireAdmin()
  const parsed = TransferSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'validation_error' }
  const res = await upsertSetting('transfer', parsed.data)
  if (res.ok) {
    revalidatePath('/checkout')
    revalidatePath('/admin/configuracion')
  }
  return res
}

// ─── Maintenance ──────────────────────────────────────────────────────────────

export async function updateMaintenance(input: { enabled: boolean }): Promise<Result> {
  await requireAdmin()
  const parsed = MaintenanceSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'validation_error' }
  const res = await upsertSetting('maintenance', parsed.data)
  if (res.ok) revalidatePath('/', 'layout')
  return res
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

export async function uploadLogo(
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  await requireAdmin()

  const file = formData.get('file') as File | null
  if (!file) return { ok: false, error: 'missing_params' }
  const fileCheck = LogoFileSchema.safeParse({ type: file.type, size: file.size })
  if (!fileCheck.success) {
    const issue = fileCheck.error.issues[0]
    return { ok: false, error: issue?.path[0] === 'size' ? 'file_too_large' : 'invalid_file_type' }
  }

  const ext =
    (file.name.split('.').pop() ?? 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png'
  const safePath = `logo-${crypto.randomUUID()}.${ext}`

  const up = await uploadImage('marca', safePath, file)
  if (!up.ok) return { ok: false, error: up.error }

  const res = await upsertSetting('branding', { logoUrl: up.url })
  if (!res.ok) return res

  revalidatePath('/', 'layout')
  return { ok: true, url: up.url }
}

export async function removeLogo(): Promise<Result> {
  await requireAdmin()

  const current = await getBrandingConfig()
  const res = await upsertSetting('branding', { logoUrl: null })
  if (!res.ok) return res

  // best-effort: if we have a path we could delete from storage;
  // logoUrl is a full URL so we can't reliably extract the path here —
  // deletion is left to a future dedicated cleanup action.
  void current

  revalidatePath('/', 'layout')
  return { ok: true }
}
