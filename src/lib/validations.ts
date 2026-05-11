import { z } from 'zod'
import type { OrderStatus } from '@/types'

const slugRegex = /^[a-z0-9-]+$/

// ─── Category ────────────────────────────────────────────────────────────────

export const CreateCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().regex(slugRegex, 'Slug must be lowercase letters, numbers, and hyphens only'),
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
  name: z.string().min(1, 'Name is required'),
  slug: z.string().regex(slugRegex, 'Slug must be lowercase letters, numbers, and hyphens only'),
  description: z.string().optional(),
  category_id: z.string().uuid(),
  images: z.array(z.string()).default([]),
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
  name: z.string().min(1, 'Variant name is required'),
  sku: z.string().optional(),
  price: z.number().int().positive('Price must be a positive integer (centavos)'),
  stock: z.number().int().min(0, 'Stock cannot be negative'),
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
