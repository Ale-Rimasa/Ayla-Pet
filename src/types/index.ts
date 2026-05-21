export interface CartItem {
  id: string
  variantId: string
  name: string
  price: number // centavos ARS — SIEMPRE entero
  quantity: number
  imageUrl: string
}

export interface CustomerInfo {
  name: string
  email: string
  phone: string
}

export interface ShippingAddress {
  street: string
  city: string
  province: string
  postalCode: string
}

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'

export interface OrderItem {
  id: string
  variantId: string | null
  productName: string
  variantName: string
  unitPrice: number       // centavos ARS
  quantity: number
  subtotal: number        // centavos ARS
  imageUrl: string | null
  createdAt: string
}

export interface Order {
  id: string
  status: OrderStatus
  items: OrderItem[]
  customer: CustomerInfo
  shippingAddress: ShippingAddress
  subtotal: number        // centavos ARS
  shippingCost: number    // centavos ARS
  total: number           // centavos ARS
  mpPreferenceId: string | null
  mpPaymentId: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface ProductImage {
  id: string
  productId: string
  url: string
  alt?: string
  label?: string
  sortOrder: number
  createdAt: string
}

export interface ProductVariant {
  id: string
  productId: string
  name: string
  price: number // centavos ARS
  stock: number
  sku?: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface Product {
  id: string
  name: string
  slug: string
  description?: string
  categoryId: string
  variants: ProductVariant[]
  images: ProductImage[]
  featured: boolean
  deletedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  imageUrl?: string
  sortOrder: number
  deletedAt?: string | null
}

export interface CreateOrderItemPayload {
  variantId: string
  productName: string
  variantName: string
  unitPrice: number       // centavos ARS
  quantity: number
  subtotal: number        // centavos ARS
  imageUrl: string | null
}

export interface CreateOrderPayload {
  userId?: string | null
  customer: CustomerInfo
  shipping: ShippingAddress
  items: CreateOrderItemPayload[]
  subtotal: number        // centavos ARS
  shippingCost: number    // centavos ARS
  total: number           // centavos ARS
  notes?: string
}

export interface GetProductsOptions {
  q?: string
  categorySlug?: string
  page?: number
  pageSize?: number
}

export interface GetProductsResult {
  data: Product[]
  count: number
  page: number
  pageSize: number
}

export interface OrderReferencePhoto {
  id: string
  orderId: string
  storagePath: string // solo uso interno; nunca enviar al cliente
  displayOrder: number
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif'
  sizeBytes: number
  createdAt: string
}

export type OrderReferencePhotoForClient = Omit<OrderReferencePhoto, 'storagePath'>
