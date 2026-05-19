import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getProducts } from '@/lib/db/products'
import { getCategories } from '@/lib/db/categories'
import { ProductCard } from '@/components/shared/ProductCard'
import { BRAND } from '@/lib/constants'
export const revalidate = 60

export const metadata: Metadata = {
  title: 'Productos',
  description: `Explorá todos los productos de ${BRAND.name}.`,
}

interface ProductsPageProps {
  searchParams: Promise<{ q?: string; categoria?: string; pagina?: string }>
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams
  const categorySlug = params.categoria
  const q = params.q?.trim() || undefined
  const rawPage = parseInt(params.pagina ?? '1', 10)
  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage

  const [{ data: products, count }, categories] = await Promise.all([
    getProducts({ q, categorySlug, page, pageSize: 12 }),
    getCategories(),
  ])

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">
            {categorySlug
              ? categories.find((c) => c.slug === categorySlug)?.name ?? 'Productos'
              : 'Todos los productos'}
          </h1>
          <p className="mt-1 text-muted-foreground">{count} productos</p>
        </div>
      </div>

      {/* Category filter pills */}
      {categories.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <Link
            href="/productos"
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              !categorySlug
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border hover:border-primary'
            }`}
          >
            Todos
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/productos?categoria=${cat.slug}`}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                categorySlug === cat.slug
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:border-primary'
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      )}

      {products.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <p className="text-muted-foreground">No hay productos en esta categoría.</p>
          <Link href="/productos" className="text-sm font-medium underline">
            Ver todos los productos
          </Link>
        </div>
      ) : (
        <Suspense fallback={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        }>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </Suspense>
      )}

      {/* Basic pagination */}
      {count > 12 && (
        <div className="mt-12 flex justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/productos?${categorySlug ? `categoria=${categorySlug}&` : ''}pagina=${page - 1}`}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              ← Anterior
            </Link>
          )}
          {page * 12 < count && (
            <Link
              href={`/productos?${categorySlug ? `categoria=${categorySlug}&` : ''}pagina=${page + 1}`}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              Siguiente →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
