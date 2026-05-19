export const REVALIDATE_MAX = 'max'
export const REVALIDATE_HOMEPAGE = 300
export const REVALIDATE_CATALOG = 60
export const REVALIDATE_PRODUCT = 30

export const BRAND = {
  name: 'PT Laser',
  displayLine1: 'PT',
  displayLine2: 'Laser',
  adminEmail: 'admin@ptlaser.com.ar',
  domain: 'ptlaser.com.ar',
  instagram: 'https://www.instagram.com/ptlaser_/',
  email: 'ventas@ptlaser.com.ar',
} as const

export const ORDER_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const

export const CATEGORY_SLUGS = {
  MASCOTAS: 'mascotas',
  CHAPAS: 'chapas',
} as const

// centavos ARS
export const SHIPPING_COSTS: Record<'standard' | 'express' | 'pickup', number> = {
  standard: 500000,
  express: 900000,
  pickup: 0,
} as const
