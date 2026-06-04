export const REVALIDATE_MAX = 'max'
export const REVALIDATE_HOMEPAGE = 300
export const REVALIDATE_CATALOG = 60
export const REVALIDATE_PRODUCT = 30

export const BRAND = {
  name: 'Ayla',
  displayLine1: 'Ayla',
  displayLine2: '',
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

export const AR_PROVINCES: Record<string, string> = {
  'Buenos Aires':          'AR-B',
  'Ciudad de Buenos Aires': 'AR-C',
  'Catamarca':             'AR-K',
  'Chaco':                 'AR-H',
  'Chubut':                'AR-U',
  'Córdoba':               'AR-X',
  'Corrientes':            'AR-W',
  'Entre Ríos':            'AR-E',
  'Formosa':               'AR-P',
  'Jujuy':                 'AR-Y',
  'La Pampa':              'AR-L',
  'La Rioja':              'AR-F',
  'Mendoza':               'AR-M',
  'Misiones':              'AR-N',
  'Neuquén':               'AR-Q',
  'Río Negro':             'AR-R',
  'Salta':                 'AR-A',
  'San Juan':              'AR-J',
  'San Luis':              'AR-D',
  'Santa Cruz':            'AR-Z',
  'Santa Fe':              'AR-S',
  'Santiago del Estero':   'AR-G',
  'Tierra del Fuego':      'AR-V',
  'Tucumán':               'AR-T',
}

export const AR_PROVINCE_CODES = Object.values(AR_PROVINCES) as [string, ...string[]]

export const AR_PROVINCES_LIST = Object.entries(AR_PROVINCES).map(
  ([name, code]) => ({ name, code })
)
