import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getCategoryBySlug } from '@/lib/db/categories'
import { getProducts } from '@/lib/db/products'
import { ProductCard } from '@/components/shared/ProductCard'
export const revalidate = 60
export const dynamicParams = true

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)
  if (!category) return {}
  return {
    title: category.name,
    description: category.description ?? `${category.name} — Jengibre Acuaceramica`,
  }
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params

  const [category, { data: products }] = await Promise.all([
    getCategoryBySlug(slug),
    getProducts({ categorySlug: slug, pageSize: 24 }),
  ])

  if (!category) notFound()

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-10">
        <h1 className="font-heading text-3xl font-bold">{category.name}</h1>
        {category.description && (
          <p className="mt-2 text-muted-foreground">{category.description}</p>
        )}
      </div>

      {products.length === 0 ? (
        <p className="py-24 text-center text-muted-foreground">
          No hay productos en esta categoría todavía.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
