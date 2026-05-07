import { Suspense } from 'react'
import Link from 'next/link'
import { getFeaturedProducts } from '@/lib/db/products'
import { getCategories } from '@/lib/db/categories'
import { ProductCard } from '@/components/shared/ProductCard'
import { CategoryCard } from '@/components/shared/CategoryCard'
import { TrustBar } from '@/components/shared/TrustBar'
import { buttonVariants } from '@/components/ui/button'
import { CATEGORY_SLUGS } from '@/lib/constants'

export const revalidate = 300

export default async function HomePage() {
  const [featuredProducts, categories] = await Promise.all([
    getFeaturedProducts(8),
    getCategories(),
  ])

  return (
    <>
      {/* Hero */}
      <section className="bg-background">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-16 sm:px-6 md:grid-cols-2 lg:px-8 lg:py-24">
          <div className="flex flex-col justify-center gap-6">
            <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Hecho a mano, <br />
              <span className="text-primary">inspirado en la naturaleza</span>
            </h1>
            <p className="max-w-md text-lg text-muted-foreground">
              Piezas únicas de cerámica y acuarela, creadas a mano en Argentina.
              Cada obra es irrepetible.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/productos" className={buttonVariants({ size: 'lg' }) + ' bg-primary hover:bg-primary/90 text-primary-foreground'}>
                Ver colección
              </Link>
              <Link href={`/categorias/${CATEGORY_SLUGS.CERAMICA}`} className={buttonVariants({ size: 'lg', variant: 'outline' })}>
                Cerámica
              </Link>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="aspect-square w-full max-w-sm rounded-2xl bg-muted" aria-hidden="true" />
          </div>
        </div>
      </section>

      <TrustBar />

      {/* Categories */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="font-heading text-2xl font-bold">Categorías</h2>
            <Link href="/productos" className="text-sm text-muted-foreground hover:text-foreground">
              Ver todo →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => (
              <CategoryCard key={cat.id} category={cat} />
            ))}
          </div>
        </section>
      )}

      {/* Featured products */}
      {featuredProducts.length > 0 && (
        <section className="bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="font-heading text-2xl font-bold">Productos destacados</h2>
              <Link href="/productos" className="text-sm text-muted-foreground hover:text-foreground">
                Ver todos →
              </Link>
            </div>
            <Suspense fallback={
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="aspect-square animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            }>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {featuredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </Suspense>
          </div>
        </section>
      )}

      {/* Promo banner */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <h2 className="font-heading text-2xl font-bold sm:text-3xl">
            Envíos a todo el país
          </h2>
          <p className="mt-2 text-primary-foreground/80">
            Comprá desde donde estés y recibí en tu puerta.
          </p>
          <Link
            href="/productos"
            className={buttonVariants({ size: 'lg', variant: 'outline' }) + ' mt-6 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary'}
          >
            Comprar ahora
          </Link>
        </div>
      </section>
    </>
  )
}
