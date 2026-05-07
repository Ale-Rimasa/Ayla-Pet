'use client'

import { useActionState } from 'react'
import Image from 'next/image'
import { LoaderCircle, LockKeyhole, Mail } from 'lucide-react'
import { loginAction } from '@/lib/actions/auth'
import { Input } from '@/components/ui/input'
import { BRAND } from '@/lib/constants'

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, null)

  return (
    <main className="relative min-h-dvh overflow-hidden bg-stone-950">
      <Image
        src="/images/brand/login-bg.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-stone-950/25 via-stone-950/35 to-stone-950/80" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_28%)]" />

      <section className="relative z-10 flex min-h-dvh items-center justify-center px-4 py-8 lg:justify-end lg:px-16 xl:px-24">
        <div className="w-full max-w-md rounded-[2rem] border border-white/30 bg-white/90 p-7 shadow-2xl shadow-stone-950/35 backdrop-blur-xl sm:p-9">
          <div className="mb-8 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[--brand-olive-dark]">
                  {BRAND.displayLine1}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-stone-500">
                  {BRAND.displayLine2}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[--brand-olive]/30 bg-[--brand-olive]/10 text-[--brand-olive-dark]">
                <LockKeyhole className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>

            <div>
              <h1 className="font-serif text-4xl font-light italic leading-tight text-stone-800">
                Ingreso del dueño
              </h1>
              <p className="mt-3 text-sm leading-6 text-stone-500">
                Accedé al panel privado para gestionar productos, pedidos y la operación de la tienda.
              </p>
            </div>
          </div>

          <form action={formAction} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-600"
              >
                Email de acceso
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={BRAND.adminEmail}
                  required
                  autoComplete="email"
                  aria-describedby="login-error"
                  className="min-h-12 rounded-full border-stone-200 bg-white/80 pl-11 pr-4 text-base text-stone-800 placeholder:text-stone-400 focus-visible:border-[--brand-olive] focus-visible:ring-[--brand-olive]/25"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-600"
              >
                Contraseña
              </label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  aria-describedby="login-error"
                  className="min-h-12 rounded-full border-stone-200 bg-white/80 pl-11 pr-4 text-base text-stone-800 placeholder:text-stone-400 focus-visible:border-[--brand-olive] focus-visible:ring-[--brand-olive]/25"
                />
              </div>
            </div>

            {/* aria-live for polite announcement; role="alert" added only when there's an error */}
            <p
              id="login-error"
              aria-live="polite"
              role={state?.error ? 'alert' : undefined}
              className="min-h-[1.25rem] text-sm font-medium text-red-600"
            >
              {state?.error ?? ''}
            </p>

            <button
              type="submit"
              disabled={pending}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[--brand-olive] px-6 py-3 text-xs font-bold uppercase tracking-[0.22em] text-white shadow-lg shadow-[--brand-olive]/25 transition duration-200 hover:bg-[--brand-olive-dark] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--brand-olive] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Ingresando
                </>
              ) : (
                'Entrar al panel'
              )}
            </button>
          </form>

          <p className="mt-7 text-center text-xs leading-5 text-stone-400">
            Panel privado de {BRAND.name}. Si no sos administrador, volvé a la tienda pública.
          </p>
        </div>
      </section>
    </main>
  )
}
