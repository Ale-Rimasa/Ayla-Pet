import { getCategories } from '@/lib/db/categories'
import { CategoriesPageClient } from '@/components/admin/CategoriesPageClient'

export default async function AdminCategoriasPage() {
  const categories = await getCategories()

  return <CategoriesPageClient categories={categories} />
}
