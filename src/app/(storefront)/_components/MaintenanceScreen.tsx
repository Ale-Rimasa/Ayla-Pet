import Link from 'next/link'
import { BRAND } from '@/lib/constants'

export function MaintenanceScreen() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="font-heading text-4xl font-bold tracking-tight">{BRAND.name}</h1>

      <div className="space-y-2">
        <p className="text-xl font-semibold">Volvemos pronto 🛠️</p>
        <p className="max-w-md text-muted-foreground">
          Estamos haciendo mejoras en la tienda. En breve vas a poder volver a
          comprar tus chapitas y accesorios personalizados.
        </p>
      </div>

      <Link
        href={BRAND.instagram}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        Seguinos en Instagram
      </Link>
    </main>
  )
}
