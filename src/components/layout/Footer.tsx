import Link from 'next/link'
import { BRAND } from '@/lib/constants'

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {/* Brand */}
          <div className="space-y-3">
            <h3 className="font-heading text-lg font-bold">
              Jengibre<span className="text-primary"> Acuaceramica</span>
            </h3>
            <p className="text-sm text-muted-foreground">
              Cerámica artesanal y acuarelas originales hechas con amor en Argentina.
            </p>
          </div>

          {/* Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Tienda
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/productos" className="text-foreground/70 transition-colors hover:text-foreground">
                  Todos los productos
                </Link>
              </li>
              <li>
                <Link href="/carrito" className="text-foreground/70 transition-colors hover:text-foreground">
                  Carrito
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Contacto
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href={BRAND.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground/70 transition-colors hover:text-foreground"
                >
                  Instagram
                </a>
              </li>
              <li>
                <a
                  href={`https://wa.me/${BRAND.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground/70 transition-colors hover:text-foreground"
                >
                  WhatsApp
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${BRAND.email}`}
                  className="text-foreground/70 transition-colors hover:text-foreground"
                >
                  {BRAND.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {BRAND.name}. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  )
}
