import type { Metadata } from 'next'
import { Geist, Geist_Mono, Playfair_Display } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { ZustandProvider } from '@/store/zustand-provider'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  title: {
    default: 'Ayla Pet',
    template: '%s | Ayla Pet',
  },
  description: 'Insignias y chapas personalizadas grabadas a laser para mascotas y más',
  openGraph: {
    siteName: 'Ayla Pet',
    locale: 'es_AR',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable}`}>
      <body>
        <ZustandProvider>
          {children}
          <Toaster />
        </ZustandProvider>
      </body>
    </html>
  )
}
