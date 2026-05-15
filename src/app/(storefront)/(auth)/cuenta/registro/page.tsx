import type { Metadata } from 'next'
import { SignUpForm } from '@/components/auth/SignUpForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Crear cuenta',
  robots: { index: false },
}

export default function RegistroPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-md items-center px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full border-[#E7DCCF] bg-white shadow-sm">
        <CardHeader className="text-center">
          <CardTitle className="font-heading text-2xl text-[#111111]">Crear cuenta</CardTitle>
          <p className="text-sm text-[#6B6258]">Guardá tus pedidos y recuperá compras como corresponde.</p>
        </CardHeader>
        <CardContent>
          <SignUpForm />
        </CardContent>
      </Card>
    </div>
  )
}
