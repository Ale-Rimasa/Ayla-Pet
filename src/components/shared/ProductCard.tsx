import Link from 'next/link'
import Image from 'next/image'
import type { Product } from '@/types'
import { PriceDisplay } from './PriceDisplay'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const minPrice = product.variants.length > 0
    ? Math.min(...product.variants.map((v) => v.price))
    : 0

  const mainImage = product.images[0]?.url ?? null

  return (
    <Link
      href={`/productos/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {mainImage ? (
          <Image
            src={mainImage}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground text-sm">
            Sin imagen
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="font-semibold leading-snug text-foreground line-clamp-2">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
        )}
        <div className="mt-auto pt-3">
          {minPrice > 0 ? (
            <PriceDisplay centavos={minPrice} />
          ) : (
            <span className="text-sm text-muted-foreground">Consultar precio</span>
          )}
        </div>
      </div>
    </Link>
  )
}
