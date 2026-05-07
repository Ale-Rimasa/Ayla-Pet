import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
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

export const metadata: Metadata = {
  title: {
    default: 'PT Laser',
    template: '%s | PT Laser',
  },
  description: 'Insignias y chapas personalizadas grabadas a laser para mascotas y más',
  openGraph: {
    siteName: 'PT Laser',
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
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <ZustandProvider>
          {children}
          <Toaster />
        </ZustandProvider>
      </body>
    </html>
  )
}
