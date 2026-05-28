import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth'
import { BRAND, TRANSFER, HERO_DEFAULTS } from '@/lib/constants'
import { MAX_HERO_IMAGES } from '@/lib/validations/settings'
import type {
  SiteSettingKey,
  SiteSettingsMap,
  HeroConfig,
  StoreInfo,
  TransferInfo,
  MaintenanceConfig,
  BrandingConfig,
} from '@/types/settings'

// ─── Raw read (anon, passes through RLS public-read) ──────────────────────────

async function readSetting(key: SiteSettingKey): Promise<Record<string, unknown>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle()
  return (data?.value as Record<string, unknown>) ?? {}
}

// ─── Typed reads with fallback to constants ───────────────────────────────────

export const getHeroConfig = cache(async function getHeroConfig(): Promise<HeroConfig> {
  const v = await readSetting('hero')
  const images = Array.isArray(v.images) ? (v.images as HeroConfig['images']) : []
  const title =
    typeof v.title === 'string' && v.title.trim() ? v.title : HERO_DEFAULTS.title
  const subtitle =
    typeof v.subtitle === 'string' && v.subtitle.trim()
      ? v.subtitle
      : HERO_DEFAULTS.subtitle
  return {
    title,
    subtitle,
    images: images.sort((a, b) => a.sortOrder - b.sortOrder).slice(0, MAX_HERO_IMAGES),
  }
})

export const getStoreInfo = cache(async function getStoreInfo(): Promise<StoreInfo> {
  const v = await readSetting('store_info')
  return {
    name: (v.name as string) || BRAND.name,
    email: (v.email as string) || BRAND.email,
    domain: (v.domain as string) || BRAND.domain,
    instagram: (v.instagram as string) || BRAND.instagram,
  }
})

export const getTransferInfo = cache(async function getTransferInfo(): Promise<TransferInfo> {
  const v = await readSetting('transfer')
  return {
    banco: (v.banco as string) || TRANSFER.banco,
    titular: (v.titular as string) || TRANSFER.titular,
    cbu: (v.cbu as string) || TRANSFER.cbu,
    alias: (v.alias as string) || TRANSFER.alias,
  }
})

export const getMaintenanceConfig = cache(async function getMaintenanceConfig(): Promise<MaintenanceConfig> {
  const v = await readSetting('maintenance')
  return { enabled: v.enabled === true }
})

export const getBrandingConfig = cache(async function getBrandingConfig(): Promise<BrandingConfig> {
  const v = await readSetting('branding')
  return { logoUrl: typeof v.logoUrl === 'string' ? v.logoUrl : null }
})

// ─── Generic upsert (service-role, requireAdmin defense-in-depth) ─────────────

export async function upsertSetting<K extends SiteSettingKey>(
  key: K,
  value: SiteSettingsMap[K],
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('site_settings')
    .upsert({ key, value }, { onConflict: 'key' })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
