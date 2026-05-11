import Link from 'next/link'
import { Search, User, Truck, Star, Heart } from 'lucide-react'
import { CartIcon } from './CartIcon'
import { BRAND, CATEGORY_SLUGS } from '@/lib/constants'

export function Navbar() {
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
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link
            href="/"
            className="shrink-0 flex flex-col items-center leading-none group"
            aria-label={BRAND.name}
          >
            <span className="font-heading text-xl font-bold tracking-tight text-[#111111] transition-opacity group-hover:opacity-80">
              {BRAND.name}
            </span>
            <span className="text-[9px] tracking-[0.25em] text-[#6B6258] uppercase">
              · PET ACCESSORIES ·
            </span>
          </Link>

          {/* Nav links */}
          <nav className="hidden items-center gap-6 lg:flex" aria-label="Navegación principal">
            <Link
              href="/"
              className="text-sm font-medium text-[#1F1F1F] transition-colors hover:text-[#B68A57]"
            >
              Inicio
            </Link>
            <Link
              href={`/categorias/${CATEGORY_SLUGS.MASCOTAS}`}
              className="text-sm font-medium text-[#6B6258] transition-colors hover:text-[#B68A57]"
            >
              Chapitas con datos
            </Link>
            <Link
              href="/productos"
              className="text-sm font-medium text-[#6B6258] transition-colors hover:text-[#B68A57]"
            >
              Retratos grabados
            </Link>
            <Link
              href={`/categorias/${CATEGORY_SLUGS.CHAPAS}`}
              className="text-sm font-medium text-[#6B6258] transition-colors hover:text-[#B68A57]"
            >
              Colecciones
            </Link>
            <Link
              href="/productos"
              className="text-sm font-medium text-[#6B6258] transition-colors hover:text-[#B68A57]"
            >
              Cómo funciona
            </Link>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Search — desktop only */}
            <div className="hidden md:flex items-center gap-2 rounded-full border border-[#E7DCCF] bg-[#FAF7F2] px-3 py-1.5">
              <Search className="h-3.5 w-3.5 text-[#6B6258]" aria-hidden="true" />
              <input
                type="search"
                placeholder="Buscar productos..."
                className="w-36 bg-transparent text-xs text-[#1F1F1F] placeholder:text-[#6B6258] outline-none"
                aria-label="Buscar productos"
              />
            </div>

            {/* User icon */}
            <Link
              href="/admin"
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#F5EFE6] transition-colors"
              aria-label="Mi cuenta"
            >
              <User className="h-4.5 w-4.5 text-[#6B6258]" aria-hidden="true" />
            </Link>

            {/* Cart */}
            <CartIcon />
          </div>
        </div>
      </header>
    </>
  )
}
