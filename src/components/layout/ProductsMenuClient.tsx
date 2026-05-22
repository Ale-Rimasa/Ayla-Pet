'use client'

import Link from 'next/link'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'

type NavProduct = { name: string; slug: string }
type NavCategory = { name: string; slug: string; products: NavProduct[] }

interface Props {
  categories: NavCategory[]
}

export function ProductsMenuClient({ categories }: Props) {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className="h-auto bg-transparent px-0 text-sm font-medium text-[#6B6258] transition-colors hover:bg-transparent hover:text-[#B68A57] focus:bg-transparent data-open:bg-transparent data-popup-open:bg-transparent">
            Productos
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="w-56 p-3">
              {categories.map((cat) => (
                <div key={cat.slug} className="mb-3 last:mb-0">
                  <Link
                    href={`/categorias/${cat.slug}`}
                    className="block rounded-md px-2 py-1.5 text-sm font-semibold text-[#1F1F1F] transition-colors hover:bg-[#FAF7F2] hover:text-[#B68A57]"
                  >
                    {cat.name}
                  </Link>
                  {cat.products.length > 0 && (
                    <ul className="mt-1 space-y-0.5 pl-2">
                      {cat.products.map((product) => (
                        <li key={product.slug}>
                          <Link
                            href={`/productos/${product.slug}`}
                            className="block rounded-md px-2 py-1 text-sm text-[#6B6258] transition-colors hover:bg-[#FAF7F2] hover:text-[#B68A57]"
                          >
                            {product.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}
