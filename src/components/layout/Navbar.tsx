import Link from 'next/link'
import Image from 'next/image'
import { Search, Truck, Star, Heart } from 'lucide-react'
import { CartIcon } from './CartIcon'
import { MobileNav } from './MobileNav'
import { ProductsMenuClient } from './ProductsMenuClient'
import { BRAND } from '@/lib/constants'
import { getCategories } from '@/lib/db/categories'
import { getNavProducts } from '@/lib/db/products'

export async function Navbar() {
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

  return (
    <>
      {/* Top info bar */}
      <div className="w-full bg-[#FAF7F2] border-b border-[#E7DCCF] text-[#6B6258] text-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Truck className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>Envíos a todo el país</span>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-center">
              <Star className="h-3 w-3 shrink-0 text-[#B68A57]" aria-hidden="true" />
              <span>Grabados láser de alta precisión · Hecho con amor</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="h-3 w-3 shrink-0 text-[#B68A57]" aria-hidden="true" />
              <span>Atención personalizada</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main header */}
      <header className="sticky top-0 z-40 w-full border-b border-[#E7DCCF] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
        {/* Mobile: 3-col grid [hamburger | logo | cart]. Desktop: flex row. */}
        <div className="mx-auto grid h-16 max-w-7xl grid-cols-[2.5rem_1fr_2.5rem] items-center gap-2 px-4 sm:px-6 lg:flex lg:gap-4 lg:px-8">

          {/* LEFT — mobile: hamburger | desktop: logo */}
          <div className="flex items-center">
            <MobileNav categories={navItems} />
            <Link
              href="/"
              className="hidden lg:flex shrink-0 items-center group"
              aria-label={BRAND.name}
            >
              <Image
                src="/logo-new.png"
                alt={BRAND.name}
                width={60}
                height={60}
                className="rounded-full object-cover transition-opacity group-hover:opacity-80"
                priority
              />
            </Link>
          </div>

          {/* CENTER — mobile: logo | desktop: nav */}
          <div className="flex items-center justify-center lg:flex-1">
            {/* Logo — mobile only */}
            <Link
              href="/"
              className="flex lg:hidden shrink-0 items-center group"
              aria-label={BRAND.name}
            >
              <Image
                src="/logo-new.png"
                alt={BRAND.name}
                width={44}
                height={44}
                className="rounded-full object-cover transition-opacity group-hover:opacity-80"
              />
            </Link>

            {/* Nav — desktop only */}
            <nav className="hidden items-center gap-6 lg:flex" aria-label="Navegación principal">
              <Link
                href="/"
                className="text-sm font-medium text-[#1F1F1F] transition-colors hover:text-[#B68A57]"
              >
                Inicio
              </Link>
              <ProductsMenuClient categories={navItems} />
              <Link
                href="/quienes-somos"
                className="text-sm font-medium text-[#6B6258] transition-colors hover:text-[#B68A57]"
              >
                Quiénes somos
              </Link>
              <Link
                href="/#asi-de-simple"
                className="text-sm font-medium text-[#6B6258] transition-colors hover:text-[#B68A57]"
              >
                Cómo funciona
              </Link>
              <Link
                href="/preguntas-frecuentes"
                className="text-sm font-medium text-[#6B6258] transition-colors hover:text-[#B68A57]"
              >
                Preguntas frecuentes
              </Link>
            </nav>
          </div>

          {/* RIGHT — search (desktop) + cart */}
          <div className="flex items-center justify-end gap-2">
            <form action="/productos" method="GET" className="hidden md:flex items-center gap-2 rounded-full border border-[#E7DCCF] bg-[#FAF7F2] px-3 py-1.5">
              <Search className="h-3.5 w-3.5 text-[#6B6258]" aria-hidden="true" />
              <input
                type="search"
                name="q"
                placeholder="Buscar productos..."
                className="w-36 bg-transparent text-xs text-[#1F1F1F] placeholder:text-[#6B6258] outline-none"
                aria-label="Buscar productos"
              />
            </form>
            <CartIcon />
          </div>

        </div>
      </header>
    </>
  )
}
