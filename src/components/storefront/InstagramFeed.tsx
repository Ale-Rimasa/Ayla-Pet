import Image from 'next/image'

export type InstagramPost = {
  /** Imagen del post (servida desde /public o Supabase Storage) */
  src: string
  /** Texto alternativo accesible que describe la imagen */
  alt: string
  /** Link al post o al perfil de Instagram */
  href: string
  /**
   * Cómo encaja la imagen en el cuadrado.
   * - 'cover' (default): llena el cuadrado y recorta los bordes.
   * - 'contain': muestra la imagen completa con barras de fondo (para fotos verticales que no se pueden recortar).
   */
  fit?: 'cover' | 'contain'
}

type InstagramFeedProps = {
  posts: InstagramPost[]
  /** URL del perfil de Instagram */
  profileUrl: string
  /** Handle sin @, ej. "aylastudio.ba" */
  handle: string
}

/**
 * Glifo de Instagram como SVG inline.
 *
 * lucide-react 1.x eliminó los íconos de marca por temas de trademark, así que
 * lo dibujamos a mano. Usa currentColor para heredar el color del texto.
 */
function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

/**
 * Grilla curada de Instagram para la home.
 *
 * No usa la API de Meta ni widgets de terceros a propósito: las imágenes se
 * curan a mano y se sirven optimizadas con next/image. Esto evita scripts
 * externos, tokens que expiran y cookies de tracking, manteniendo el LCP bajo.
 */
export function InstagramFeed({ posts, profileUrl, handle }: InstagramFeedProps) {
  if (posts.length === 0) return null

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-2 mb-10">
          <InstagramGlyph className="h-6 w-6 text-sf-gold" />
          <h2 className="font-heading text-2xl font-semibold text-center text-sf-ink sm:text-3xl">
            Seguinos en Instagram
          </h2>
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-sf-warm transition-colors hover:text-sf-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sf-gold rounded"
          >
            @{handle}
          </a>
        </div>

        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-6">
          {posts.map((post) => (
            <li key={post.src}>
              <a
                href={post.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block aspect-square overflow-hidden rounded-xl bg-sf-cream-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sf-gold"
              >
                <Image
                  src={post.src}
                  alt={post.alt}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className={`transition-transform duration-300 group-hover:scale-105 ${
                    post.fit === 'contain' ? 'object-contain' : 'object-cover'
                  }`}
                />
                <div
                  className="absolute inset-0 flex items-center justify-center bg-sf-ink/0 transition-colors duration-300 group-hover:bg-sf-ink/40"
                  aria-hidden="true"
                >
                  <InstagramGlyph className="h-7 w-7 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </div>
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex justify-center">
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-sf-ink bg-transparent px-6 text-sm font-semibold text-sf-ink transition-colors hover:bg-sf-ink hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sf-ink"
          >
            <InstagramGlyph className="h-4 w-4" />
            Seguinos
          </a>
        </div>
      </div>
    </section>
  )
}
