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
import type { CorreoArgentinoQuote } from '@/lib/correo-argentino'

const PROVINCIAS = [
  { label: 'Buenos Aires Prov.', value: 'AR-B' },
  { label: 'CABA',               value: 'AR-C' },
  { label: 'Catamarca',          value: 'AR-K' },
  { label: 'Chaco',              value: 'AR-H' },
  { label: 'Chubut',             value: 'AR-U' },
  { label: 'Córdoba',            value: 'AR-X' },
  { label: 'Corrientes',         value: 'AR-W' },
  { label: 'Entre Ríos',         value: 'AR-E' },
  { label: 'Formosa',            value: 'AR-P' },
  { label: 'Jujuy',              value: 'AR-Y' },
  { label: 'La Pampa',           value: 'AR-L' },
  { label: 'La Rioja',           value: 'AR-F' },
  { label: 'Mendoza',            value: 'AR-M' },
  { label: 'Misiones',           value: 'AR-N' },
  { label: 'Neuquén',            value: 'AR-Q' },
  { label: 'Río Negro',          value: 'AR-R' },
  { label: 'Salta',              value: 'AR-A' },
  { label: 'San Juan',           value: 'AR-J' },
  { label: 'San Luis',           value: 'AR-D' },
  { label: 'Santa Cruz',         value: 'AR-Z' },
  { label: 'Santa Fe',           value: 'AR-S' },
  { label: 'Santiago del Estero',value: 'AR-G' },
  { label: 'Tierra del Fuego',   value: 'AR-V' },
  { label: 'Tucumán',            value: 'AR-T' },
]

interface Props {
  items: Array<{ variantId: string; quantity: number }>
  showEstimationNote?: boolean
}

type QuoteState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; andreani?: AndreaniDomicilioQuote; correoArgentino?: CorreoArgentinoQuote; cp: string }
  | { status: 'unresolvable'; reason: string }
  | { status: 'error' }

const CP_REGEX = /^\d{4,8}$/

export function ShippingQuoteAccordion({ items, showEstimationNote = false }: Props) {
  const [cp, setCp] = useState('')
  const [provincia, setProvincia] = useState('')
  const [quoteState, setQuoteState] = useState<QuoteState>({ status: 'idle' })
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cpValid = CP_REGEX.test(cp)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!cpValid) {
      setQuoteState({ status: 'idle' })
      return
    }

    debounceRef.current = setTimeout(async () => {
      setQuoteState({ status: 'loading' })

      try {
        const body: Record<string, unknown> = { cp, items }
        if (provincia) body.provincia = provincia

        const res = await fetch('/api/shipping/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        const data = (await res.json()) as {
          andreani?: AndreaniDomicilioQuote
          correoArgentino?: CorreoArgentinoQuote
          error?: string
          reason?: string
        }

        if (res.status === 422) {
          setQuoteState({ status: 'unresolvable', reason: data.reason ?? 'profile_incomplete' })
          return
        }

        if (!res.ok || (!data.andreani && !data.correoArgentino)) {
          setQuoteState({ status: 'error' })
          return
        }

        setQuoteState({
          status: 'success',
          andreani: data.andreani,
          correoArgentino: data.correoArgentino,
          cp,
        })
      } catch {
        setQuoteState({ status: 'error' })
      }
    }, 600)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [cp, provincia, items, cpValid])

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
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="quote-cp" className="text-sm">
                Código postal
              </Label>
              <Input
                id="quote-cp"
                placeholder="ej: 1414"
                value={cp}
                onChange={(e) => setCp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                className="w-[130px]"
                maxLength={8}
              />
            </div>

            {cpValid && (
              <div className="space-y-1.5">
                <Label htmlFor="quote-provincia" className="text-sm">
                  Provincia
                </Label>
                <select
                  id="quote-provincia"
                  value={provincia}
                  onChange={(e) => setProvincia(e.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-[180px]"
                >
                  <option value="">Seleccioná...</option>
                  {PROVINCIAS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            )}
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
              {/* Andreani */}
              {quoteState.andreani && (
              <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div>
                  <p className="font-medium">Andreani — a domicilio</p>
                  <p className="text-xs text-muted-foreground">{quoteState.andreani.estimatedDays}</p>
                </div>
                <span className="font-semibold">{formatPrice(quoteState.andreani.price)}</span>
              </div>
              )}

              {/* Correo Argentino */}
              {quoteState.correoArgentino && (
                <>
                  <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <div>
                      <p className="font-medium">Correo Argentino — a domicilio</p>
                      <p className="text-xs text-muted-foreground">Entrega estimada según destino</p>
                    </div>
                    <span className="font-semibold">
                      {formatPrice(quoteState.correoArgentino.aDomicilioCentavos)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <div>
                      <p className="font-medium">Correo Argentino — a sucursal</p>
                      <p className="text-xs text-muted-foreground">Retirás en sucursal más cercana</p>
                    </div>
                    <span className="font-semibold">
                      {formatPrice(quoteState.correoArgentino.aSucursalCentavos)}
                    </span>
                  </div>
                </>
              )}

              {showEstimationNote && (
                <p className="text-xs text-muted-foreground">
                  * Estimación para 1 unidad. El costo final se calcula con tu carrito completo al confirmar la compra.
                </p>
              )}
            </div>
          )}

          {quoteState.status === 'idle' && (
            <p className="text-xs text-muted-foreground">
              Ingresá tu código postal para ver el costo de envío.
            </p>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
