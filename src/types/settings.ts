// Keys válidas de site_settings
export type SiteSettingKey = 'hero' | 'store_info' | 'transfer' | 'maintenance' | 'branding'

export interface HeroImage {
  url: string
  sortOrder: number
}

export interface HeroConfig {
  title: string
  subtitle: string
  images: HeroImage[] // max 3, ordenadas por sortOrder
}

export interface StoreInfo {
  name: string
  email: string
  domain: string
  instagram: string
}

export interface TransferInfo {
  banco: string
  titular: string
  cbu: string
  alias: string
}

export interface MaintenanceConfig {
  enabled: boolean
}

export interface BrandingConfig {
  logoUrl: string | null
}

// Map key -> value type (para getSiteSetting generico)
export interface SiteSettingsMap {
  hero: HeroConfig
  store_info: StoreInfo
  transfer: TransferInfo
  maintenance: MaintenanceConfig
  branding: BrandingConfig
}
