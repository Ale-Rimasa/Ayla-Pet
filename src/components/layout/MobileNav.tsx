'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet'
import { BRAND } from '@/lib/constants'

type NavProduct = { name: string; slug: string }
type NavCategory = { name: string; slug: string; products: NavProduct[] }

interface Props {
  categories?: NavCategory[]
}

const STATIC_LINKS = [
  { href: '/', label: 'Inicio' },
  { href: '/quienes-somos', label: 'Quiénes somos' },
  { href: '/#asi-de-simple', label: 'Cómo funciona' },
  { href: '/preguntas-frecuentes', label: 'Preguntas frecuentes' },
]

export function MobileNav({ categories = [] }: Props) {
  const [productsOpen, setProductsOpen] = useState(false)

  return (
    <Sheet>
      <SheetTrigger
        aria-label="Abrir menú"
        className="flex items-center justify-center rounded-md p-2 text-[#1F1F1F] transition-colors hover:bg-[#FAF7F2] lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>

      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b border-[#E7DCCF] px-6 py-4">
          <SheetTitle className="font-heading text-base font-bold text-[#111111]">
            {BRAND.name}
          </SheetTitle>
        </SheetHeader>

        <nav className="flex flex-col gap-1 px-4 py-4" aria-label="Menú mobile">
          {/* Inicio */}
          <SheetClose
            render={
              <Link
                href="/"
                className="rounded-md px-3 py-3 text-sm font-medium text-[#1F1F1F] transition-colors hover:bg-[#FAF7F2] hover:text-[#B68A57]"
              />
            }
          >
            Inicio
          </SheetClose>

          {/* Productos — desplegable */}
          <div>
            <button
              onClick={() => setProductsOpen((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-md px-3 py-3 text-sm font-medium text-[#1F1F1F] transition-colors hover:bg-[#FAF7F2] hover:text-[#B68A57]"
              aria-expanded={productsOpen}
            >
              Productos
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform duration-200',
                  productsOpen && 'rotate-180'
                )}
              />
            </button>

            {productsOpen && categories.length > 0 && (
              <div className="mt-1 flex flex-col gap-0.5 pl-3">
                {categories.map((cat) => (
                  <div key={cat.slug}>
                    <SheetClose
                      render={
                        <Link
                          href={`/categorias/${cat.slug}`}
                          className="block rounded-md px-2 py-2 text-sm font-semibold text-[#1F1F1F] transition-colors hover:bg-[#FAF7F2] hover:text-[#B68A57]"
                        />
                      }
                    >
                      {cat.name}
                    </SheetClose>

                    {cat.products.length > 0 && (
                      <ul className="mt-0.5 space-y-0.5 pl-3">
                        {cat.products.map((product) => (
                          <li key={product.slug}>
                            <SheetClose
                              render={
                                <Link
                                  href={`/productos/${product.slug}`}
                                  className="block rounded-md px-2 py-1.5 text-sm text-[#6B6258] transition-colors hover:bg-[#FAF7F2] hover:text-[#B68A57]"
                                />
                              }
                            >
                              {product.name}
                            </SheetClose>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resto de links */}
          {STATIC_LINKS.slice(1).map((link) => (
            <SheetClose
              key={link.href}
              render={
                <Link
                  href={link.href}
                  className="rounded-md px-3 py-3 text-sm font-medium text-[#1F1F1F] transition-colors hover:bg-[#FAF7F2] hover:text-[#B68A57]"
                />
              }
            >
              {link.label}
            </SheetClose>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
