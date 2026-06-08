import Link from 'next/link'
import Image from 'next/image'
import { Mail } from 'lucide-react'
import { BRAND, LINKS } from '@/lib/constants'
import { buildWhatsAppLink } from '@/lib/utils'
import { NewsletterForm } from './NewsletterForm'

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

// WhatsApp icon (not in lucide by default)
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.94a8.17 8.17 0 004.78 1.52V7.01a4.85 4.85 0 01-1.01-.32z" />
    </svg>
  )
}

export function Footer() {
  const whatsappContactUrl = buildWhatsAppLink('Hola, tengo una consulta')
  const whatsappPersonalizeUrl = buildWhatsAppLink('Hola, quiero personalizar')

  return (
    <footer className="border-t border-[#E7DCCF] bg-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:gap-12">

          {/* Brand column */}
          <div className="col-span-2 sm:col-span-1 space-y-4">
            {/* Logo */}
            <Link href="/" className="inline-flex items-center">
              <Image
                src="/logo-new.png"
                alt={BRAND.name}
                width={44}
                height={44}
                className="rounded-full object-cover"
              />
            </Link>
            <p className="text-sm text-[#6B6258] leading-relaxed max-w-[200px]">
              Accesorios personalizados para que los amemos como familia.
            </p>
            {/* Social icons */}
            <div className="flex items-center gap-3">
              <a
                href={BRAND.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E7DCCF] text-[#6B6258] transition-colors hover:border-[#B68A57] hover:text-[#B68A57]"
              >
                <InstagramIcon className="h-3.5 w-3.5" />
              </a>
<a
                href={whatsappContactUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E7DCCF] text-[#6B6258] transition-colors hover:border-[#B68A57] hover:text-[#B68A57]"
              >
                <WhatsAppIcon className="h-3.5 w-3.5" />
              </a>
              <a
                href={`mailto:${BRAND.email}`}
                aria-label="Email"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E7DCCF] text-[#6B6258] transition-colors hover:border-[#B68A57] hover:text-[#B68A57]"
              >
                <Mail className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Tienda */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-[#111111]">
              Tienda
            </h4>
            <ul className="space-y-2.5 text-sm text-[#6B6258]">
              <li>
                <Link href="/productos" className="transition-colors hover:text-[#B68A57]">
                  Todos los productos
                </Link>
              </li>
            </ul>
          </div>

          {/* Información */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-[#111111]">
              Información
            </h4>
            <ul className="space-y-2.5 text-sm text-[#6B6258]">
              <li>
                <Link href="/#asi-de-simple" className="transition-colors hover:text-[#B68A57]">
                  Cómo funciona
                </Link>
              </li>
              <li>
                <Link href="/quienes-somos" className="transition-colors hover:text-[#B68A57]">
                  Quiénes somos
                </Link>
              </li>
              <li>
                <a
                  href={LINKS.igDirect}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-[#B68A57]"
                >
                  Contacto
                </a>
              </li>
            </ul>
          </div>

          {/* Ayuda + Newsletter */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-[#111111]">
              Ayuda
            </h4>
            <ul className="space-y-2.5 text-sm text-[#6B6258]">
              <li>
                <Link href="/preguntas-frecuentes" className="transition-colors hover:text-[#B68A57]">
                  Preguntas frecuentes
                </Link>
              </li>
            </ul>

          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col gap-4 border-t border-[#E7DCCF] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#6B6258]">
            © {new Date().getFullYear()} {BRAND.name}. Todos los derechos reservados.
          </p>

          {/* Payment methods */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#6B6258]">Medios de pago:</span>
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-10 items-center justify-center rounded border border-[#E7DCCF] bg-white px-1">
                <span className="text-[10px] font-bold text-blue-700">VISA</span>
              </div>
              <div className="flex h-6 w-10 items-center justify-center rounded border border-[#E7DCCF] bg-white px-1">
                <span className="text-[10px] font-bold text-red-600">MC</span>
              </div>
              <div className="flex h-6 w-10 items-center justify-center rounded border border-[#E7DCCF] bg-white px-1">
                <span className="text-[9px] font-bold text-[#009EE3]">MP</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
