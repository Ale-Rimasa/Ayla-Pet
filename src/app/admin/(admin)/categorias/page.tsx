import Link from 'next/link'
import { getCategoriesForAdmin } from '@/lib/db/categories'
import { CategoriesPageClient } from '@/components/admin/CategoriesPageClient'

interface PageProps {
  searchParams: Promise<{ deleted?: string }>
}

export default async function AdminCategoriasPage({ searchParams }: PageProps) {
  const { deleted } = await searchParams
  const showDeleted = deleted === '1'
  const categories = await getCategoriesForAdmin({ includeDeleted: showDeleted })

  return (
    <CategoriesPageClient
      categories={categories}
      action={
        <Link
          href={showDeleted ? '/admin/categorias' : '/admin/categorias?deleted=1'}
          className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted"
        >
          {showDeleted ? 'Ocultar eliminadas' : 'Ver eliminadas'}
        </Link>
      }
    />
  )
}
