import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Verificar cuenta',
  robots: { index: false },
}

interface VerificarPageProps {
  searchParams: Promise<{ code?: string }>
}

export default async function VerificarPage({ searchParams }: VerificarPageProps) {
  const { code } = await searchParams

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) redirect('/cuenta')

    return <VerificationMessage title="No pudimos verificar tu cuenta" message="El enlace venció o no es válido. Probá ingresar nuevamente." />
  }

  return <VerificationMessage title="Revisá tu email" message="Te enviamos un enlace para confirmar tu cuenta antes de ingresar." />
}

function VerificationMessage({ title, message }: { title: string; message: string }) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-md items-center px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full border-[#E7DCCF] bg-white text-center shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-2xl text-[#111111]">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[#6B6258]">{message}</p>
          <Link href="/cuenta/login" className="inline-flex h-10 items-center justify-center rounded-full bg-[#111111] px-5 text-sm font-semibold text-white hover:bg-[#111111]/90">
            Ir al login
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
