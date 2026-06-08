import Link from 'next/link'
import Image from 'next/image'
import {
  Star,
  Heart,
} from 'lucide-react'
import { getCategories } from '@/lib/db/categories'
import { getHeroConfig } from '@/lib/db/site-settings'
import { CATEGORY_SLUGS, LINKS } from '@/lib/constants'
import { HeroCarousel } from '@/components/storefront/HeroCarousel'

// Next.js route segment config requires a statically-analyzable literal — cannot use imported constant
export const revalidate = 300

// ─── Static data ──────────────────────────────────────────────────────────────

const PROCESS_STEPS = [
  {
    num: '1',
    title: 'Elegí tu producto',
    desc: 'Seleccioná el accesorio que más te guste.',
    image: '/examples/chapita.png',
    imageAlt: 'Ejemplo de chapita grabada a laser',
  },
  {
    num: '2',
    title: 'Subí datos o imagen',
    desc: 'Agregá el nombre, teléfono o la foto de tu mascota.',
    image: '/examples/step-2.jpeg',
    imageAlt: 'Ejemplo de imagen o datos para grabar',
  },
  {
    num: '3',
    title: 'Lo grabamos para vos',
    desc: 'Grabado láser de alta precisión con máxima calidad.',
    image: '/examples/step-3.jpeg',
    imageAlt: 'Proceso de grabado laser',
  },
  {
    num: '4',
    title: 'Lo recibís en casa',
    desc: 'Hecho con amor y enviado con mucho cuidado.',
    image: '/examples/step-4.jpeg',
    imageAlt: 'Producto terminado listo para enviar',
  },
]

const TESTIMONIAL_SCREENSHOTS = [
  {
    src: '/examples/testimonial-1.jpg',
    alt: 'Recomendación de cliente por WhatsApp',
  },
  {
    src: '/Galo-Testimonial.png',
    alt: 'Recomendación de cliente',
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const [categories, hero] = await Promise.all([getCategories(), getHeroConfig()])

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-sf-cream">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid min-h-[520px] grid-cols-1 lg:grid-cols-2 lg:min-h-[560px]">

            {/* Left: copy */}
            <div className="flex flex-col justify-center gap-5 py-14 lg:py-20 lg:pr-8 z-10">
              <h1 className="font-heading text-5xl font-bold leading-[1.1] tracking-tight text-sf-ink sm:text-6xl lg:text-[4.5rem]">
                {hero.title}
              </h1>
              <p className="max-w-sm text-base text-sf-warm leading-relaxed">
                {hero.subtitle}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/productos"
                  className="inline-flex h-11 items-center justify-center rounded-full bg-sf-ink px-6 text-sm font-semibold text-white transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sf-ink"
                >
                  VER PRODUCTOS
                </Link>
                <a
                  href={LINKS.igChat}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-sf-ink bg-transparent px-6 text-sm font-semibold text-sf-ink transition-colors hover:bg-sf-ink hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sf-ink"
                >
                  CONTACTO
                </a>
              </div>
            </div>

            {/* Right: hero carousel */}
            <div className="relative hidden lg:block overflow-hidden">
              <HeroCarousel
                images={hero.images}
                fallbackSrc="/referencias-ui/home-rustica-beige-blanco-negro.png"
                alt="Perro con chapita grabada Pet Laser"
              />
            </div>
          </div>
        </div>

        {/* Mobile hero carousel below copy */}
        <div className="relative h-64 w-full overflow-hidden lg:hidden">
          <HeroCarousel
            images={hero.images}
            fallbackSrc="/referencias-ui/home-rustica-beige-blanco-negro.png"
            alt="Perro con chapita grabada Pet Laser"
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          CATEGORIES — "Elegí cómo llevar su esencia"
      ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-2xl font-semibold text-center text-sf-ink mb-10 sm:text-3xl">
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
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-sf-cream-deep">
                    {cat.imageUrl ? (
                      <Image
                        src={cat.imageUrl}
                        alt={cat.name}
                        fill
                        sizes="(max-width: 640px) 50vw, 25vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full bg-sf-cream-deep" />
                    )}
                  </div>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-sf-ink leading-tight">
                        {cat.name}
                      </p>
                      {cat.description && (
                        <p className="text-xs text-sf-warm mt-0.5 line-clamp-1">
                          {cat.description}
                        </p>
                      )}
                    </div>
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-sf-sand text-sf-warm text-sm transition-colors group-hover:border-sf-gold group-hover:text-sf-gold"
                      aria-hidden="true"
                    >
                      →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-6">
              {[
                { name: 'Chapitas con datos', desc: 'Nombre y teléfono grabados', slug: CATEGORY_SLUGS.MASCOTAS },
                { name: 'Llaveros con imagen', desc: 'Su retrato, siempre con vos', slug: CATEGORY_SLUGS.CHAPAS },
                { name: 'Pulseras con imagen', desc: 'Un vínculo que se lleva en la piel', slug: CATEGORY_SLUGS.CHAPAS },
                { name: 'Collares con imagen', desc: 'Cerca de su corazón, siempre', slug: CATEGORY_SLUGS.MASCOTAS },
              ].map((cat) => (
                <Link
                  key={cat.name}
                  href={`/categorias/${cat.slug}`}
                  className="group flex flex-col gap-3"
                >
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-sf-cream-deep" />
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-sf-ink leading-tight">{cat.name}</p>
                      <p className="text-xs text-sf-warm mt-0.5">{cat.desc}</p>
                    </div>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-sf-sand text-sf-warm text-sm transition-colors group-hover:border-sf-gold group-hover:text-sf-gold" aria-hidden="true">
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
          PROCESS — "Así de simple"
      ═══════════════════════════════════════════════════════════════ */}
      <section id="asi-de-simple" className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-2xl font-semibold text-center text-sf-ink mb-12 sm:text-3xl">
            Así de simple
          </h2>

          <div className="relative">
            <div
              className="absolute top-10 hidden border-t-2 border-dashed border-sf-sand lg:block lg:left-[12.5%] lg:right-[12.5%]"
              aria-hidden="true"
            />
            <div className="grid grid-cols-2 gap-8 sm:gap-6 lg:grid-cols-4">
              {PROCESS_STEPS.map((step) => (
                <div key={step.num} className="flex flex-col items-center gap-4 text-center">
                  <div className="relative z-10 h-20 w-20 rounded-full border-2 border-sf-sand bg-white shadow-sm overflow-hidden">
                    <Image
                      src={step.image}
                      alt={step.imageAlt}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-sf-gold mb-1">{step.num}</p>
                    <p className="text-sm font-semibold text-sf-ink mb-1">{step.title}</p>
                    <p className="text-xs text-sf-warm leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          TESTIMONIALS — "Lo que dicen nuestros clientes"
      ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-sf-cream py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-2xl font-semibold text-center text-sf-ink mb-10 sm:text-3xl">
            Lo que dicen nuestros clientes
          </h2>

          <div className="flex flex-wrap justify-center gap-6">
            {TESTIMONIAL_SCREENSHOTS.map((t) => (
              <div
                key={t.src}
                className="relative w-64 rounded-2xl overflow-hidden border border-sf-sand shadow-sm shrink-0"
              >
                <Image
                  src={t.src}
                  alt={t.alt}
                  width={256}
                  height={360}
                  className="object-cover w-full h-auto"
                />
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-8">
            <div className="flex items-center gap-2 text-sm text-sf-warm">
              <Heart className="h-4 w-4 text-sf-gold" aria-hidden="true" />
              Cada pedido, hecho con dedicación y cuidado
            </div>
            <div className="flex items-center gap-2 text-sm text-sf-warm">
              <Star className="h-4 w-4 fill-sf-gold text-sf-gold" aria-hidden="true" />
              4.9/5 en opiniones de clientes
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FINAL CTA BANNER — "Creá hoy un recuerdo único"
      ═══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-sf-ink">
        <div className="absolute inset-y-0 right-0 w-1/2 hidden lg:block" aria-hidden="true">
          <Image
            src="/Mate sección - Crea hoy un recuerdo unico.jpeg"
            alt=""
            fill
            sizes="50vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-sf-ink via-sf-ink/50 to-transparent" />
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
              <a
                href={LINKS.igChat}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center rounded-full bg-white px-7 text-sm font-bold text-sf-ink transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                CONTACTO
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
