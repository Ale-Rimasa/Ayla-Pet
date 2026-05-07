import Link from 'next/link'
import { CartIcon } from './CartIcon'
import { CATEGORY_SLUGS } from '@/lib/constants'

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="font-heading text-xl font-bold tracking-tight text-foreground transition-opacity hover:opacity-80"
        >
          Jengibre
          <span className="text-primary"> Acuaceramica</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/productos"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Productos
          </Link>
          <Link
            href={`/productos?categoria=${CATEGORY_SLUGS.CERAMICA}`}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Cerámica
          </Link>
          <Link
            href={`/productos?categoria=${CATEGORY_SLUGS.ACUARELA}`}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Acuarela
          </Link>
        </nav>

        {/* Cart */}
        <CartIcon />
      </div>
    </header>
  )
}
