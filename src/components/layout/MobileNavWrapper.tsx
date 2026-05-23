import { getCategories } from '@/lib/db/categories'
import { getNavProducts } from '@/lib/db/products'
import { MobileNav } from './MobileNav'

export async function MobileNavWrapper() {
  const [categories, { data: products }] = await Promise.all([
    getCategories(),
    getNavProducts(),
  ])

  const navItems = categories.map((cat) => ({
    name: cat.name,
    slug: cat.slug,
    products: products
      .filter((p) => p.categoryId === cat.id)
      .map((p) => ({ name: p.name, slug: p.slug })),
  }))

  return <MobileNav categories={navItems} />
}
