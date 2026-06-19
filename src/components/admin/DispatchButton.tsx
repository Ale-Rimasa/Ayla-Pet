'use client'

import { useTransition } from 'react'
import { Mail, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { dispatchOrder } from '@/lib/actions/orders'
import type { OrderStatus } from '@/types'

interface DispatchButtonProps {
  orderId: string
  status: OrderStatus
}

// Dispatch is only valid from 'processing' (processing → shipped). The Server
// Action enforces this too; the button just mirrors it for UX.
function messageFor(error: string): string {
  switch (error) {
    case 'invalid-input':
      return 'Pedido inválido'
    case 'not-found':
      return 'Pedido no encontrado'
    case 'invalid-transition':
      return 'El pedido no está en proceso'
    case 'transition-failed':
      return 'No se pudo actualizar el estado del pedido'
    default:
      return 'No se pudo despachar el pedido'
  }
}

export function DispatchButton({ orderId, status }: DispatchButtonProps) {
  const [pending, startTransition] = useTransition()
  const dispatchable = status === 'processing'

  function handleClick(event: React.MouseEvent) {
    event.stopPropagation()
    startTransition(async () => {
      try {
        const result = await dispatchOrder(orderId)
        if (result.ok) {
          if (result.emailSent) {
            toast.success('Pedido marcado como enviado y email al cliente enviado')
          } else {
            toast.warning('Pedido marcado como enviado, pero el email no se pudo enviar')
          }
        } else {
          toast.error(messageFor(result.error))
        }
      } catch {
        toast.error('No se pudo despachar el pedido')
      }
    })
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={handleClick}
      onPointerDown={(event) => event.stopPropagation()}
      disabled={!dispatchable || pending}
      aria-label="Marcar como enviado y avisar al cliente"
      title={
        dispatchable
          ? 'Marcar como enviado y avisar al cliente'
          : 'Solo se puede despachar un pedido en proceso'
      }
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Mail className="h-4 w-4" aria-hidden="true" />
      )}
    </Button>
  )
}
