import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/LoginForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Ingresar a mi cuenta',
  robots: { index: false },
}

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams

  return (
    <div className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-md items-center px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full border-[#E7DCCF] bg-white shadow-sm">
        <CardHeader className="text-center">
          <CardTitle className="font-heading text-2xl text-[#111111]">Ingresar</CardTitle>
          <p className="text-sm text-[#6B6258]">Entrá para ver tus pedidos y datos de cuenta.</p>
        </CardHeader>
        <CardContent>
          <LoginForm nextPath={next ?? '/cuenta'} />
        </CardContent>
      </Card>
    </div>
  )
}
