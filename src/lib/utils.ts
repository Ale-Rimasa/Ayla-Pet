import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { env } from '@/env'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(centavos: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(centavos / 100)
}

export function buildWhatsAppLink(message: string): string {
  const phone = env.NEXT_PUBLIC_WHATSAPP_NUMBER
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}
