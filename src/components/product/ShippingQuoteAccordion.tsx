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

// CP argentino: 4–8 dígitos (mismo formato que valida la API)
const CP_REGEX = /^\d{4,8}$/

interface ShippingQuoteAccordionProps {
  /** Variante seleccionada en la página de producto. Si es null, el formulario se deshabilita. */
  variantId: string | null
}

interface CorreoArgentinoQuote {
  aDomicilioCentavos: number
  aSucursalCentavos: number
  rateSource: 'official' | 'mock'
  quotedAt: string
  aDomicilioDiasMin?: string
  aDomicilioDiasMax?: string
  aSucursalDiasMin?: string
  aSucursalDiasMax?: string
}

interface AndreaniQuote {
  price: number
  estimatedDays: number
  quotedAt: string
}

interface ShippingQuoteResponse {
  correoArgentino?: CorreoArgentinoQuote
  andreani?: AndreaniQuote
  cacheKey?: string
}

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
          ...(provincia ? { provincia } : {}),
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
              <div className="space-y-2 border-t pt-3">
                <p className="font-medium">Correo Argentino</p>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    A domicilio
                    {result.correoArgentino.aDomicilioDiasMin && result.correoArgentino.aDomicilioDiasMax && (
                      <span className="block text-xs">
                        {result.correoArgentino.aDomicilioDiasMin}–{result.correoArgentino.aDomicilioDiasMax} días hábiles
                      </span>
                    )}
                  </span>
                  <PriceDisplay centavos={result.correoArgentino.aDomicilioCentavos} size="sm" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    A sucursal
                    {result.correoArgentino.aSucursalDiasMin && result.correoArgentino.aSucursalDiasMax && (
                      <span className="block text-xs">
                        {result.correoArgentino.aSucursalDiasMin}–{result.correoArgentino.aSucursalDiasMax} días hábiles
                      </span>
                    )}
                  </span>
                  <PriceDisplay centavos={result.correoArgentino.aSucursalCentavos} size="sm" />
                </div>
              </div>
            )}

            {result?.andreani && (
              <div className="space-y-2 border-t pt-3">
                <p className="font-medium">Andreani</p>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Envío a domicilio
                    <span className="block text-xs">
                      {result.andreani.estimatedDays} días hábiles
                    </span>
                  </span>
                  <PriceDisplay centavos={result.andreani.price} size="sm" />
                </div>
              </div>
            )}
          </div>

          <p className="text-muted-foreground">
            Ofrecemos envíos con{' '}
            <strong className="text-foreground">Correo Argentino</strong> y{' '}
            <strong className="text-foreground">Andreani</strong>.
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
                • <strong className="text-foreground">PAQ.AR Expreso</strong> — 1 a 3 días hábiles (una vez despachado)
              </li>
              <li>
                • <strong className="text-foreground">PAQ.AR Clásico</strong> — 2 a 5 días hábiles (una vez despachado)
              </li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <p className="font-medium">Andreani</p>
            <ul className="space-y-1 text-muted-foreground pl-1">
              <li>• Te enviamos el link de pago y elegís la modalidad dentro de Andreani.</li>
            </ul>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
