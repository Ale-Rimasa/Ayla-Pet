'use client'

import { useState } from 'react'
import { Truck, Loader2 } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { PriceDisplay } from '@/components/shared/PriceDisplay'
import { AR_PROVINCES_LIST } from '@/lib/constants'
import type { CorreoArgentinoQuote } from '@/lib/correo-argentino'

// CP argentino: 4–8 dígitos (mismo formato que valida la API)
const CP_REGEX = /^\d{4,8}$/

interface ShippingQuoteAccordionProps {
  /** Variante seleccionada en la página de producto. Si es null, el formulario se deshabilita. */
  variantId: string | null
}

interface ShippingQuoteResponse {
  correoArgentino?: CorreoArgentinoQuote
}

// ── Render por grupo de entrega y velocidad ────────────────────────────────────

const SHIPPING_GROUPS: { key: 'domicilio' | 'sucursal'; label: string }[] = [
  { key: 'domicilio', label: 'A domicilio' },
  { key: 'sucursal', label: 'A sucursal' },
]

const SHIPPING_SPEEDS: { key: 'clasico' | 'expreso'; label: string }[] = [
  { key: 'clasico', label: 'Clásico' },
  { key: 'expreso', label: 'Expreso' },
]

export function ShippingQuoteAccordion({ variantId }: ShippingQuoteAccordionProps) {
  const [cp, setCp] = useState('')
  const [provincia, setProvincia] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cpInvalid, setCpInvalid] = useState(false)
  const [result, setResult] = useState<ShippingQuoteResponse | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!variantId) return

    // Validación de CP en el cliente antes de cualquier request
    if (!CP_REGEX.test(cp)) {
      setCpInvalid(true)
      setError('Ingresá un código postal válido (4 a 8 números)')
      setResult(null)
      return
    }

    if (!provincia) {
      setError('Seleccioná una provincia para cotizar')
      setResult(null)
      return
    }

    setCpInvalid(false)
    setError(null)
    setResult(null)
    setLoading(true)

    try {
      const response = await fetch('/api/shipping/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cp,
          provincia,
          items: [{ variantId, quantity: 1 }],
        }),
      })

      if (response.status === 429) {
        setError('Demasiadas consultas, esperá un momento')
        return
      }

      if (response.status === 422) {
        setError('No pudimos calcular el envío para este producto')
        return
      }

      if (!response.ok) {
        setError('No pudimos obtener la cotización, probá de nuevo')
        return
      }

      const data: ShippingQuoteResponse = await response.json()
      setResult(data)
    } catch {
      setError('No pudimos obtener la cotización, probá de nuevo')
    } finally {
      setLoading(false)
    }
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

        <AccordionContent className="pb-4 space-y-4 text-sm">
          {/* Cotizador de envío en vivo */}
          <div className="space-y-3 rounded-lg border p-3">
            <p className="font-medium">Calculá el costo de envío</p>

            {variantId ? (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="shipping-quote-cp">Código postal</Label>
                    <Input
                      id="shipping-quote-cp"
                      inputMode="numeric"
                      maxLength={8}
                      placeholder="Ej: 1425"
                      value={cp}
                      onChange={(e) => {
                        setCp(e.target.value)
                        setCpInvalid(false)
                      }}
                      aria-invalid={cpInvalid}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="shipping-quote-provincia">Provincia</Label>
                    <Select value={provincia} onValueChange={(value) => setProvincia(value ?? '')}>
                      <SelectTrigger id="shipping-quote-provincia" className="w-full">
                        <span className={!provincia ? 'text-sm text-muted-foreground' : 'text-sm'}>
                          {provincia
                            ? AR_PROVINCES_LIST.find((p) => p.code === provincia)?.name
                            : 'Seleccioná una provincia'}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {AR_PROVINCES_LIST.map(({ name, code }) => (
                          <SelectItem key={code} value={code}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cotizando...
                    </>
                  ) : (
                    'Cotizar'
                  )}
                </Button>
              </form>
            ) : (
              <p className="text-muted-foreground">
                Elegí una variante del producto para cotizar el envío.
              </p>
            )}

            {error && (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            )}

            {result?.correoArgentino && (
              <div className="space-y-3 border-t pt-3">
                <p className="font-medium">Correo Argentino</p>
                {SHIPPING_GROUPS.map((group) => {
                  const rates = result.correoArgentino![group.key]
                  const speeds = SHIPPING_SPEEDS.filter((speed) => rates[speed.key] !== null)
                  if (speeds.length === 0) return null

                  return (
                    <div key={group.key} className="space-y-1">
                      <p className="text-muted-foreground">{group.label}</p>
                      {speeds.map((speed) => {
                        const rate = rates[speed.key]!
                        return (
                          <div key={speed.key} className="flex items-center justify-between pl-2">
                            <span className="text-muted-foreground">
                              {speed.label}
                              {rate.diasMin && rate.diasMax && (
                                <span className="block text-xs">
                                  {rate.diasMin}–{rate.diasMax} días hábiles
                                </span>
                              )}
                            </span>
                            <PriceDisplay centavos={rate.priceCentavos} size="sm" />
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )}

          </div>

          <p className="text-muted-foreground">
            Ofrecemos envíos con{' '}
            <strong className="text-foreground">Correo Argentino</strong>.
          </p>

          <div className="space-y-1.5">
            <p className="font-medium">Tipo de entrega</p>
            <ul className="space-y-1 text-muted-foreground pl-1">
              <li>• Domicilio</li>
              <li>• Sucursal</li>
              <li>• Retiro en Parque Patricio</li>
              <li>• Retiro en Gral. Pacheco</li>
              <li>• Retiro en Nordelta</li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <p className="font-medium">Correo Argentino</p>
            <ul className="space-y-1 text-muted-foreground pl-1">
              <li>
                • <strong className="text-foreground">PAQ.AR Clásico</strong> — 2 a 5 días hábiles (una vez despachado)
              </li>
            </ul>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
