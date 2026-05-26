'use client'

import { useState } from 'react'
import { ProductGallery } from '@/components/product/ProductGallery'
import { ProductTrustBar } from '@/components/product/ProductTrustBar'
import { VariantSelector } from '@/components/product/VariantSelector'
import { AddToCartButton } from '@/components/product/AddToCartButton'
import { WhatsAppButton } from '@/components/shared/WhatsAppButton'
import { PriceDisplay } from '@/components/shared/PriceDisplay'
import { ShippingQuoteAccordion } from '@/components/product/ShippingQuoteAccordion'
import { PaymentMethodsAccordion } from '@/components/product/PaymentMethodsAccordion'
import type { Product, ProductVariant } from '@/types'

interface ProductDetailClientProps {
  product: Product & { variants: ProductVariant[] }
}

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const firstAvailable =
    product.variants.find((v) => v.stock > 0) ?? product.variants[0] ?? null
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(firstAvailable)

  const whatsappMessage = `Hola! Me interesa el producto: ${product.name}${selectedVariant ? ` (${selectedVariant.name})` : ''}. ¿Tiene stock disponible?`

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        {/* Gallery + trust bar */}
        <div>
          <ProductGallery images={product.images} productName={product.name} />
          <ProductTrustBar />
        </div>

        {/* Details */}
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="font-heading text-3xl font-bold leading-tight">{product.name}</h1>
            {product.description && (
              <p className="mt-3 text-muted-foreground leading-relaxed">{product.description}</p>
            )}
          </div>

          {/* Price */}
          {selectedVariant && (
            <PriceDisplay centavos={selectedVariant.price} size="lg" />
          )}

          {/* Variant selector */}
          {product.variants.length > 0 && (
            <VariantSelector
              variants={product.variants}
              selectedId={selectedVariant?.id ?? null}
              onVariantChange={setSelectedVariant}
            />
          )}

          {/* Stock label */}
          {selectedVariant && (
            <p className="text-sm text-muted-foreground">
              {selectedVariant.stock > 0
                ? `Stock disponible: ${selectedVariant.stock} unidades`
                : 'Sin stock'}
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row">
            {selectedVariant && (
              <AddToCartButton
                item={{
                  id: product.id,
                  variantId: selectedVariant.id,
                  name: `${product.name} — ${selectedVariant.name}`,
                  price: selectedVariant.price,
                  imageUrl: product.images[0]?.url ?? '',
                }}
                stock={selectedVariant.stock}
                className="flex-1"
              />
            )}
            <WhatsAppButton
              message={whatsappMessage}
              label="Consultar"
              className="flex-1"
            />
          </div>

          {/* Acordeones informativos */}
          <div className="space-y-2">
            {selectedVariant && (
              <ShippingQuoteAccordion
                items={[{ variantId: selectedVariant.id, quantity: 1 }]}
                showEstimationNote
              />
            )}
            <PaymentMethodsAccordion />
          </div>
        </div>
      </div>
    </div>
  )
}
