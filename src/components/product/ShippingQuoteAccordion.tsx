'use client'

import { useState, useEffect, useRef } from 'react'
import { Truck, Loader2, AlertTriangle } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatPrice } from '@/lib/utils'
import type { AndreaniDomicilioQuote } from '@/types/shipping'

interface Props {
  /** Items a cotizar. Para página de producto: [{ variantId, quantity: 1 }] */
  items: Array<{ variantId: string; quantity: number }>
  /** Mostrar aclaración de estimación (true en página de producto) */
  showEstimationNote?: boolean
}

type QuoteState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; quote: AndreaniDomicilioQuote; cp: string }
  | { status: 'unresolvable'; reason: string }
  | { status: 'error' }

const CP_REGEX = /^\d{4,8}$/

export function ShippingQuoteAccordion({ items, showEstimationNote = false }: Props) {
  const [cp, setCp] = useState('')
  const [quoteState, setQuoteState] = useState<QuoteState>({ status: 'idle' })
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!CP_REGEX.test(cp)) {
      setQuoteState({ status: 'idle' })
      return
    }

    debounceRef.current = setTimeout(async () => {
      setQuoteState({ status: 'loading' })

      try {
        const res = await fetch('/api/shipping/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cp, items }),
        })

        const data = (await res.json()) as {
          quote?: AndreaniDomicilioQuote
          error?: string
          reason?: string
        }

        if (res.status === 422) {
          setQuoteState({ status: 'unresolvable', reason: data.reason ?? 'profile_incomplete' })
          return
        }

        if (!res.ok || !data.quote) {
          setQuoteState({ status: 'error' })
          return
        }

        setQuoteState({ status: 'success', quote: data.quote, cp })
      } catch {
        setQuoteState({ status: 'error' })
      }
    }, 600)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [cp, items])

  function unresolvableMessage(reason: string): string {
    if (reason === 'missing_profiles') {
      return 'Este producto no tiene embalaje configurado. Consultanos por WhatsApp para cotizar el envío.'
    }
    if (reason === 'profile_not_active' || reason === 'profile_incomplete') {
      return 'El embalaje de este producto está siendo configurado. Cotización no disponible por ahora.'
    }
    return 'No podemos cotizar el envío para esta combinación de productos.'
  }

  return (
    <Accordion multiple={false}>
      <AccordionItem value="envio" className="border rounded-lg px-4">
        <AccordionTrigger className="py-4 no-underline hover:no-underline">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Truck className="h-4 w-4 text-muted-foreground" />
            Medios de envío
          </div>
        </AccordionTrigger>

        <AccordionContent className="pb-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="quote-cp" className="text-sm">
              Código postal de destino
            </Label>
            <Input
              id="quote-cp"
              placeholder="ej: 1414"
              value={cp}
              onChange={(e) => setCp(e.target.value.replace(/\D/g, '').slice(0, 8))}
              className="max-w-[180px]"
              maxLength={8}
            />
          </div>

          {quoteState.status === 'loading' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cotizando para CP {cp}…
            </div>
          )}

          {quoteState.status === 'unresolvable' && (
            <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>{unresolvableMessage(quoteState.reason)}</p>
            </div>
          )}

          {quoteState.status === 'error' && (
            <p className="text-sm text-destructive">
              No se pudo cotizar el envío. Reintentá en unos segundos.
            </p>
          )}

          {quoteState.status === 'success' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div>
                  <p className="font-medium">Andreani Estándar — a domicilio</p>
                  <p className="text-xs text-muted-foreground">{quoteState.quote.estimatedDays}</p>
                </div>
                <span className="font-semibold">{formatPrice(quoteState.quote.price)}</span>
              </div>

              {showEstimationNote && (
                <p className="text-xs text-muted-foreground">
                  * Estimación para 1 unidad. El costo final se calcula con tu carrito completo al confirmar la compra.
                </p>
              )}
            </div>
          )}

          {quoteState.status === 'idle' && (
            <p className="text-xs text-muted-foreground">
              Ingresá tu código postal para ver el costo de envío a domicilio.
            </p>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
