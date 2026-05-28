export const REVALIDATE_MAX = 'max'
export const REVALIDATE_HOMEPAGE = 300
export const REVALIDATE_CATALOG = 60
export const REVALIDATE_PRODUCT = 30

export const BRAND = {
  name: 'Ayla Pets',
  displayLine1: 'Ayla',
  displayLine2: 'Pets',
  adminEmail: 'supportaylapet@gmail.com',
  domain: 'ptlaser.com.ar',
  instagram: 'https://www.instagram.com/aylapets_/',
  email: 'supportaylapet@gmail.com',
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

export const TRANSFER = {
  cbu: '0070693930004003890360',
  alias: 'Aylapets',
  titular: 'Jose Alejandro Rimasa',
  banco: 'Galicia',
} as const

export const HERO_DEFAULTS = {
  title: 'Su esencia grabada para siempre',
  subtitle: 'Piezas personalizadas creadas para celebrar el vínculo con tu mascota',
} as const

export const LINKS = {
  igChat: 'https://ig.me/m/aylapets_',
} as const
