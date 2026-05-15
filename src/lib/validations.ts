import { z } from 'zod'
import type { OrderStatus } from '@/types'

const slugRegex = /^[a-z0-9-]+$/

// Customer Auth

export const SignInSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

export const SignUpSchema = z.object({
  name: z
    .string()
    .min(2, 'Ingresá tu nombre completo')
    .max(80, 'Nombre demasiado largo'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

export type SignInValues = z.infer<typeof SignInSchema>
export type SignUpValues = z.infer<typeof SignUpSchema>

// ─── Category ────────────────────────────────────────────────────────────────

export const CreateCategorySchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  slug: z.string().regex(slugRegex, 'El slug solo puede tener minúsculas, números y guiones'),
  description: z.string().optional(),
  image_url: z.string().url().optional(),
  sort_order: z.number().int().default(0),
})

export const UpdateCategorySchema = CreateCategorySchema.partial().extend({
  id: z.string().uuid(),
})

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>

// ─── Product ─────────────────────────────────────────────────────────────────

export const CreateProductSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  slug: z.string().regex(slugRegex, 'El slug solo puede tener minúsculas, números y guiones'),
  description: z.string().optional(),
  category_id: z.string().uuid(),
  images: z.array(z.string().url()).default([]),
  featured: z.boolean().default(false),
})

export const UpdateProductSchema = CreateProductSchema.partial().extend({
  id: z.string().uuid(),
})

export type CreateProductInput = z.infer<typeof CreateProductSchema>
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>

// ─── Variant ─────────────────────────────────────────────────────────────────

export const CreateVariantSchema = z.object({
  product_id: z.string().uuid(),
  name: z.string().min(1, 'El nombre de la variante es obligatorio'),
  sku: z.string().optional(),
  price: z.number().int().positive('El precio debe ser un entero positivo (centavos)'),
  stock: z.number().int().min(0, 'El stock no puede ser negativo'),
  sort_order: z.number().int().default(0),
})

export const UpdateVariantSchema = CreateVariantSchema.partial().extend({
  id: z.string().uuid(),
})

export type CreateVariantInput = z.infer<typeof CreateVariantSchema>
export type UpdateVariantInput = z.infer<typeof UpdateVariantSchema>

// ─── Order ───────────────────────────────────────────────────────────────────

const orderStatusValues: [OrderStatus, ...OrderStatus[]] = [
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
]

// ─── Checkout ────────────────────────────────────────────────────────────────

export const CheckoutSchema = z.object({
  customer: z.object({
    name: z.string().min(2, 'Ingresá tu nombre completo'),
    email: z.string().email('Email inválido'),
    phone: z.string().min(8, 'Ingresá un teléfono válido'),
  }),
  shippingAddress: z.object({
    street: z.string().min(3, 'Ingresá la dirección'),
    city: z.string().min(2, 'Ingresá la ciudad'),
    province: z.string().min(2, 'Ingresá la provincia'),
    postalCode: z.string().min(4, 'Ingresá el código postal'),
  }),
  shippingMethod: z.enum(['standard', 'express', 'pickup']),
})

export type CheckoutFormValues = z.infer<typeof CheckoutSchema>

// ─── Cart ─────────────────────────────────────────────────────────────────────

export const CartItemsSchema = z
  .array(
    z.object({
      variantId: z.string().uuid(),
      quantity: z.number().int().positive(),
    })
  )
  .min(1)
  .max(50)

export type CartItemsInput = z.infer<typeof CartItemsSchema>

// ─── Order ───────────────────────────────────────────────────────────────────

export const UpdateOrderStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(orderStatusValues),
  notes: z.string().optional(),
})

export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>
