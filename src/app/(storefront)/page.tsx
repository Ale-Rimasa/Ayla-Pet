import { Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ShoppingCart,
  ImageIcon,
  Coffee,
  Gift,
  Truck,
  Star,
  Droplets,
  Heart,
  Award,
  Zap,
  Package,
} from 'lucide-react'
import { getFeaturedProducts } from '@/lib/db/products'
import { getCategories } from '@/lib/db/categories'
import { ProductCard } from '@/components/shared/ProductCard'
import { BRAND, CATEGORY_SLUGS } from '@/lib/constants'
import { buildWhatsAppLink } from '@/lib/utils'

export const revalidate = 300

// ─── Static data ──────────────────────────────────────────────────────────────

const PROCESS_STEPS = [
  {
    icon: ShoppingCart,
    num: '1',
    title: 'Elegí tu producto',
    desc: 'Seleccioná el accesorio que más te guste.',
  },
  {
    icon: ImageIcon,
    num: '2',
    title: 'Subí datos o imagen',
    desc: 'Agregá el nombre, teléfono o la foto de tu mascota.',
  },
  {
    icon: Coffee,
    num: '3',
    title: 'Lo grabamos para vos',
    desc: 'Grabado láser de alta precisión con máxima calidad.',
  },
  {
    icon: Gift,
    num: '4',
    title: 'Lo recibís en casa',
    desc: 'Hecho con amor y enviado con mucho cuidado.',
  },
]

const BENEFITS = [
  {
    icon: Award,
    title: 'Calidad premium',
    desc: 'Materiales nobles y acabados duraderos.',
  },
  {
    icon: Zap,
    title: 'Grabado láser',
    desc: 'Precisión y detalle en cada pieza.',
  },
  {
    icon: Droplets,
    title: 'Resistentes',
    desc: 'Ideales para el uso diario. No se borran ni se oxidan.',
  },
  {
    icon: Heart,
    title: 'Personalización real',
    desc: 'Cada pieza cuenta su propia historia.',
  },
  {
    icon: Package,
    title: 'Embalaje especial',
    desc: 'Listo para regalar, hecho para emocionar.',
  },
]

const TESTIMONIALS = [
  {
    stars: 5,
    text: '"Hermoso trabajo, superó mis expectativas. La chapita de mi perra quedó divina y llegó rapidísimo. ¡Gracias!"',
    name: 'Martina R.',
    role: 'Mamá de Mía',
    petImg: '/referencias-ui/home-rustica-beige-blanco-negro.png',
    petAlt: 'Mascota de Martina',
    halfStar: false,
  },
  {
    stars: 5,
    text: '"El retrato de mi gata es idéntico. Se nota el amor y la dedicación en cada detalle. 100% recomendable."',
    name: 'Lucía M.',
    role: 'Mamá de Nala',
    petImg: '/referencias-ui/home-rustica-beige-blanco-negro.png',
    petAlt: 'Mascota de Lucía',
    halfStar: false,
  },
  {
    stars: 4,
    text: '"Compré el llavero para regalar y fue un éxito. La calidad es increíble."',
    name: 'Diego S.',
    role: 'Papá de Kira',
    petImg: '/referencias-ui/home-rustica-beige-blanco-negro.png',
    petAlt: 'Mascota de Diego',
    halfStar: true,
  },
]

// ─── Components ───────────────────────────────────────────────────────────────

function StarRating({ stars, half = false }: { stars: number; half?: boolean }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${stars} estrellas`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < stars
              ? 'fill-[#B68A57] text-[#B68A57]'
              : half && i === stars
                ? 'fill-[#B68A57]/50 text-[#B68A57]/50'
                : 'fill-[#E7DCCF] text-[#E7DCCF]'
          }`}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const [featuredProducts, categories] = await Promise.all([
    getFeaturedProducts(8),
    getCategories(),
  ])

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-[#FAF7F2]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid min-h-[520px] grid-cols-1 lg:grid-cols-2 lg:min-h-[560px]">

            {/* Left: copy */}
            <div className="flex flex-col justify-center gap-5 py-14 lg:py-20 lg:pr-8 z-10">
              <h1 className="font-heading text-5xl font-bold leading-[1.1] tracking-tight text-[#111111] sm:text-6xl lg:text-[4.5rem]">
                Grabados que<br />
                los acompañan<br />
                siempre
              </h1>
              <p className="max-w-sm text-base text-[#6B6258] leading-relaxed">
                Accesorios personalizados que guardan su nombre, su historia y el amor que nos dan.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/productos"
                  className="inline-flex h-11 items-center justify-center rounded-full bg-[#111111] px-6 text-sm font-semibold text-white transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]"
                >
                  VER PRODUCTOS
                </Link>
                <Link
                  href={buildWhatsAppLink('Hola, quiero personalizar una chapita')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#111111] bg-transparent px-6 text-sm font-semibold text-[#111111] transition-colors hover:bg-[#111111] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]"
                >
                  PERSONALIZAR AHORA
                  <span aria-hidden="true">🐾</span>
                </Link>
              </div>

              {/* Mini trust badges */}
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                {[
                  { icon: Zap, label: 'Grabado láser\nde alta precisión' },
                  { icon: Award, label: 'Acero inoxidable\npremium' },
                  { icon: Droplets, label: 'Resistentes al agua\ny al uso diario' },
                  { icon: Heart, label: 'Hechos con amor\ny dedicación' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <Icon className="h-4 w-4 text-[#B68A57] shrink-0" aria-hidden="true" />
                    <span className="text-[11px] text-[#6B6258] leading-tight whitespace-pre-line">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: dog image + chapitas card */}
            <div className="relative hidden lg:flex items-end justify-end overflow-hidden">
              {/* Background dog image */}
              <Image
                src="/referencias-ui/home-rustica-beige-blanco-negro.png"
                alt="Perro con chapita grabada Pet Laser"
                fill
                priority
                sizes="(max-width: 1024px) 0px, 50vw"
                className="object-cover object-[70%_20%]"
              />
              {/* Gradient overlay for blending */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#FAF7F2] via-[#FAF7F2]/20 to-transparent" />

              {/* Chapitas card overlay */}
              <div className="relative z-10 mb-12 mr-6 rounded-2xl bg-white/90 backdrop-blur-sm shadow-lg border border-[#E7DCCF] p-5 max-w-[260px]">
                <div className="flex gap-3 mb-3">
                  {['LUNA', 'MILO', 'OLI'].map((name) => (
                    <div
                      key={name}
                      className="flex flex-col items-center gap-1"
                    >
                      <div className="h-14 w-14 rounded-full bg-[#B68A57]/20 border-2 border-[#B68A57]/30 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-[#B68A57] text-center leading-tight">
                          {name}<br />
                          <span className="font-normal text-[#6B6258]">11 2345 6789</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm font-semibold text-[#111111]">Chapitas con datos</p>
                <p className="text-xs text-[#6B6258]">Nombre y teléfono siempre a mano.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile hero image below copy */}
        <div className="relative h-64 w-full overflow-hidden lg:hidden">
          <Image
            src="/referencias-ui/home-rustica-beige-blanco-negro.png"
            alt="Perro con chapita grabada Pet Laser"
            fill
            priority
            sizes="100vw"
            className="object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#FAF7F2]/60 to-transparent" />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          CATEGORIES — "Elegí cómo llevar su esencia"
      ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-2xl font-semibold text-center text-[#111111] mb-10 sm:text-3xl">
            Elegí cómo llevar su esencia
          </h2>

          {categories.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-6">
              {categories.slice(0, 4).map((cat) => (
                <Link
                  key={cat.id}
                  href={`/categorias/${cat.slug}`}
                  className="group flex flex-col gap-3"
                >
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-[#F5EFE6]">
                    {cat.imageUrl ? (
                      <Image
                        src={cat.imageUrl}
                        alt={cat.name}
                        fill
                        sizes="(max-width: 640px) 50vw, 25vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full bg-[#F5EFE6]" />
                    )}
                  </div>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#111111] leading-tight">
                        {cat.name}
                      </p>
                      {cat.description && (
                        <p className="text-xs text-[#6B6258] mt-0.5 line-clamp-1">
                          {cat.description}
                        </p>
                      )}
                    </div>
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#E7DCCF] text-[#6B6258] text-sm transition-colors group-hover:border-[#B68A57] group-hover:text-[#B68A57]"
                      aria-hidden="true"
                    >
                      →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            /* Static fallback categories when DB is empty */
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-6">
              {[
                { name: 'Chapitas con datos', desc: 'Nombre y teléfono grabados', slug: CATEGORY_SLUGS.MASCOTAS },
                { name: 'Llaveros con imagen', desc: 'Su retrato, siempre con vos', slug: CATEGORY_SLUGS.CHAPAS },
                { name: 'Pulseras con imagen', desc: 'Un vínculo que se lleva en la piel', slug: CATEGORY_SLUGS.MASCOTAS },
                { name: 'Collares con imagen', desc: 'Cerca de su corazón, siempre', slug: CATEGORY_SLUGS.MASCOTAS },
              ].map((cat) => (
                <Link
                  key={cat.name}
                  href={`/categorias/${cat.slug}`}
                  className="group flex flex-col gap-3"
                >
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-[#F5EFE6]" />
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#111111] leading-tight">{cat.name}</p>
                      <p className="text-xs text-[#6B6258] mt-0.5">{cat.desc}</p>
                    </div>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#E7DCCF] text-[#6B6258] text-sm transition-colors group-hover:border-[#B68A57] group-hover:text-[#B68A57]" aria-hidden="true">
                      →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FEATURED PRODUCTS — "Más elegidos"
      ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-[#FAF7F2] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="font-heading text-2xl font-semibold text-[#111111] sm:text-3xl">
              Más elegidos
            </h2>
            <Link
              href="/productos"
              className="text-xs font-semibold tracking-wider text-[#6B6258] uppercase transition-colors hover:text-[#B68A57]"
            >
              VER TODOS LOS PRODUCTOS →
            </Link>
          </div>

          <Suspense
            fallback={
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-xl bg-[#F5EFE6] aspect-square" />
                ))}
              </div>
            }
          >
            {featuredProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {featuredProducts.slice(0, 5).map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              /* Static fallback products when DB is empty */
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {[
                  { name: 'Chapita Hueso Clásica', price: '$18.900', rating: 4, reviews: 128 },
                  { name: 'Chapita Redonda', price: '$18.900', rating: 4, reviews: 94, isNew: true },
                  { name: 'Chapita Corazón', price: '$18.900', rating: 4, reviews: 87, isNew: true },
                  { name: 'Llavero Rectangular', price: '$24.900', rating: 4, reviews: 63 },
                  { name: 'Pulsera con Retrato', price: '$28.900', rating: 5, reviews: 52 },
                ].map((p) => (
                  <Link
                    key={p.name}
                    href="/productos"
                    className="group flex flex-col gap-3"
                  >
                    <div className="relative aspect-square overflow-hidden rounded-xl bg-[#F5EFE6]">
                      {'isNew' in p && p.isNew && (
                        <span className="absolute left-2 top-2 z-10 rounded-full bg-[#B68A57] px-2 py-0.5 text-[10px] font-bold text-white">
                          Nuevo
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#111111] leading-tight">{p.name}</p>
                      <p className="text-sm font-bold text-[#111111] mt-1">{p.price}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <StarRating stars={p.rating} />
                        <span className="text-xs text-[#6B6258]">({p.reviews})</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Suspense>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          PROCESS — "Así de simple"
      ═══════════════════════════════════════════════════════════════ */}
      <section id="asi-de-simple" className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-2xl font-semibold text-center text-[#111111] mb-12 sm:text-3xl">
            Así de simple
          </h2>

          <div className="relative">
            {/* Connecting dashed line — desktop only */}
            <div
              className="absolute left-0 right-0 top-10 hidden border-t-2 border-dashed border-[#E7DCCF] lg:block"
              style={{ left: '12.5%', right: '12.5%' }}
              aria-hidden="true"
            />

            <div className="grid grid-cols-2 gap-8 sm:gap-6 lg:grid-cols-4">
              {PROCESS_STEPS.map((step) => (
                <div key={step.num} className="flex flex-col items-center gap-4 text-center">
                  {/* Icon circle */}
                  <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#E7DCCF] bg-white shadow-sm">
                    <step.icon className="h-7 w-7 text-[#B68A57]" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#B68A57] mb-1">
                      {step.num}
                    </p>
                    <p className="text-sm font-semibold text-[#111111] mb-1">{step.title}</p>
                    <p className="text-xs text-[#6B6258] leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          BENEFITS — "¿Por qué elegir Ayla Pet?"
      ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-[#FAF7F2] py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-2xl font-semibold text-center text-[#111111] mb-10 sm:text-3xl">
            ¿Por qué elegir {BRAND.name}?
          </h2>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
            {BENEFITS.map((b) => (
              <div key={b.title} className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#E7DCCF] bg-white">
                  <b.icon className="h-5 w-5 text-[#B68A57]" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#111111]">{b.title}</p>
                  <p className="mt-0.5 text-xs text-[#6B6258] leading-relaxed">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          PORTRAIT PROMO — "Su mirada, para siempre con vos"
      ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left: copy */}
            <div className="flex flex-col gap-5">
              <p className="text-xs font-bold tracking-[0.2em] text-[#B68A57] uppercase">
                Retratos que enamoran
              </p>
              <h2 className="font-heading text-3xl font-bold text-[#111111] leading-tight sm:text-4xl lg:text-[2.75rem]">
                Su mirada, para<br />
                siempre con vos
              </h2>
              <p className="text-base text-[#6B6258] leading-relaxed max-w-sm">
                Convertimos su foto en un grabado único. Un recuerdo eterno en piezas que te acompañan todos los días.
              </p>
              <div>
                <Link
                  href="/productos"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#111111] px-6 text-sm font-semibold text-white transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]"
                >
                  VER COLECCIÓN DE RETRATOS
                  <span aria-hidden="true">🐾</span>
                </Link>
              </div>
            </div>

            {/* Right: product images grid */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { alt: 'Llavero rectangular con retrato grabado a láser' },
                { alt: 'Pulsera dorada con retrato grabado a láser' },
                { alt: 'Medallón circular con retrato grabado a láser' },
              ].map((img, i) => (
                <div
                  key={i}
                  className="relative aspect-[3/4] overflow-hidden rounded-xl bg-[#F5EFE6]"
                >
                  {/* Placeholder — replace with real product images when available */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#F5EFE6] to-[#E7DCCF]" aria-hidden="true" />
                  <span className="sr-only">{img.alt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          TESTIMONIALS — "Lo que dicen nuestros clientes"
      ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-[#FAF7F2] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-2xl font-semibold text-center text-[#111111] mb-10 sm:text-3xl">
            Lo que dicen nuestros clientes
          </h2>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="rounded-2xl border border-[#E7DCCF] bg-white p-6 flex flex-col gap-4"
              >
                <StarRating stars={t.stars} half={t.halfStar} />
                <p className="text-sm text-[#1F1F1F] leading-relaxed flex-1">{t.text}</p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="h-10 w-10 rounded-full overflow-hidden bg-[#F5EFE6] shrink-0">
                    {/* Pet avatar placeholder */}
                    <div className="h-full w-full bg-[#E7DCCF]" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#111111]">{t.name}</p>
                    <p className="text-xs text-[#6B6258]">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Social proof numbers */}
          <div className="mt-10 flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-8">
            <div className="flex items-center gap-2 text-sm text-[#6B6258]">
              <Heart className="h-4 w-4 text-[#B68A57]" aria-hidden="true" />
              Más de 2.500 pedidos entregados con amor
            </div>
            <div className="flex items-center gap-2 text-sm text-[#6B6258]">
              <Star className="h-4 w-4 fill-[#B68A57] text-[#B68A57]" aria-hidden="true" />
              4.9/5 en opiniones de clientes
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FINAL CTA BANNER — "Creá hoy un recuerdo único"
      ═══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-[#111111]">
        {/* Background image with overlay */}
        <div className="absolute inset-0" aria-hidden="true">
          <Image
            src="/referencias-ui/home-rustica-beige-blanco-negro.png"
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-center opacity-20"
          />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="flex flex-col gap-5">
            <h2 className="font-heading text-3xl font-bold text-white leading-tight sm:text-4xl lg:text-5xl">
              Creá hoy un recuerdo único
            </h2>
            <p className="text-base text-white/70 max-w-md">
              Personalizado. Duradero. Irrepetible.
            </p>
            <div>
              <Link
                href={buildWhatsAppLink('Hola, quiero personalizar una chapita')}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-bold text-[#111111] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                PERSONALIZAR AHORA
                <span aria-hidden="true">🐾</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
