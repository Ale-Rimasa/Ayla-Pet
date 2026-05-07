'use client'

import { MessageCircle } from 'lucide-react'
import { buildWhatsAppLink } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface WhatsAppButtonProps {
  message: string
  label?: string
  className?: string
}

export function WhatsAppButton({
  message,
  label = 'Consultar por WhatsApp',
  className,
}: WhatsAppButtonProps) {
  const href = buildWhatsAppLink(message)

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(buttonVariants({ variant: 'outline' }), className)}
    >
      <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
      {label}
    </a>
  )
}
