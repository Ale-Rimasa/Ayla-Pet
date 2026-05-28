import { z } from 'zod'

export const MAX_HERO_IMAGES = 3
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const
const MAX_HERO_FILE_SIZE = 5 * 1024 * 1024
const MAX_LOGO_FILE_SIZE = 2 * 1024 * 1024

export const HeroImageFileSchema = z.object({
  type: z.enum(ALLOWED_IMAGE_TYPES),
  size: z.number().max(MAX_HERO_FILE_SIZE),
})

export const LogoFileSchema = z.object({
  type: z.enum(ALLOWED_IMAGE_TYPES),
  size: z.number().max(MAX_LOGO_FILE_SIZE),
})

export const HeroCopySchema = z.object({
  title: z.string().trim().min(1).max(80),
  subtitle: z.string().trim().min(1).max(160),
})

export const StoreInfoSchema = z.object({
  name: z.string().trim().min(1).max(60),
  email: z.string().trim().email(),
  domain: z.string().trim().min(1).max(120),
  instagram: z.string().trim().min(1),
})

export const TransferSchema = z.object({
  banco: z.string().trim().min(1).max(60),
  titular: z.string().trim().min(1).max(80),
  cbu: z.string().trim().length(22).regex(/^\d+$/),
  alias: z.string().trim().min(1).max(40),
})

export const MaintenanceSchema = z.object({
  enabled: z.boolean(),
})

export const DeleteHeroImageSchema = z.object({
  imageUrl: z.string().url(),
  imagePath: z.string().min(1),
})

export const ReorderHeroImagesSchema = z.object({
  orderedUrls: z.array(z.string().url()).min(1).max(MAX_HERO_IMAGES),
})
