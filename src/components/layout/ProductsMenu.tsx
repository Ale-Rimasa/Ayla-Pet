import { getCategories } from '@/lib/db/categories'
import { getProducts } from '@/lib/db/products'
import { ProductsMenuClient } from './ProductsMenuClient'

export async function ProductsMenu() {
  const [categories, { data: products }] = await Promise.all([
    getCategories(),
    getProducts({ pageSize: 100 }),
  ])

  const navItems = categories.map((cat) => ({
    name: cat.name,
    slug: cat.slug,
    products: products
      .filter((p) => p.categoryId === cat.id)
      .map((p) => ({ name: p.name, slug: p.slug })),
  }))

  return <ProductsMenuClient categories={navItems} />
}
