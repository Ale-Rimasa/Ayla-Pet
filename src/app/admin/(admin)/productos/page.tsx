import { Plus } from 'lucide-react'
import { getProductsForAdmin } from '@/lib/db/products'
import { getCategories } from '@/lib/db/categories'
import { ProductsPageClient } from '@/components/admin/ProductsPageClient'

interface PageProps {
  searchParams: Promise<{ q?: string; categoria?: string; page?: string }>
}

export default async function AdminProductosPage({ searchParams }: PageProps) {
  const { q, categoria, page } = await searchParams
  const currentPage = Number(page ?? '1') || 1

  const [{ data: products, count }, categories] = await Promise.all([
    getProductsForAdmin({
      q: q || undefined,
      categoryId: categoria || undefined,
      page: currentPage,
      pageSize: 20,
    }),
    getCategories(),
  ])

  return (
    <ProductsPageClient
      products={products}
      categories={categories}
      count={count}
      currentPage={currentPage}
      searchQuery={q}
      categoryFilter={categoria}
    />
  )
}
