'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useCartStore } from '@/store/cart.store'
import { useCheckoutStore } from '@/store/checkout.store'
import { CheckoutSchema } from '@/lib/validations'
import type { CheckoutFormValues } from '@/lib/validations'
import { formatPrice } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { StepIndicator } from '@/components/checkout/StepIndicator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { AndreaniDomicilioQuote } from '@/types/shipping'

const STEP1_FIELDS: (
  | keyof CheckoutFormValues
  | `customer.${keyof CheckoutFormValues['customer']}`
  | `shippingAddress.${keyof CheckoutFormValues['shippingAddress']}`
)[] = [
  'customer.name',
  'customer.email',
  'customer.phone',
  'shippingAddress.street',
  'shippingAddress.city',
  'shippingAddress.province',
  'shippingAddress.postalCode',
  'shippingMethod',
]

function stepToNumber(step: 'shipping' | 'review' | 'payment'): 1 | 2 {
  return step === 'shipping' ? 1 : 2
}

type QuoteState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; quote: AndreaniDomicilioQuote }
  | { status: 'unresolvable'; reason: string }
  | { status: 'error' }

const CP_REGEX = /^\d{4,8}$/

export function CheckoutForm() {
  const router = useRouter()
  const items = useCartStore((s) => s.items)
  const totalPrice = useCartStore((s) => s.totalPrice)

  const step = useCheckoutStore((s) => s.step)
  const setStep = useCheckoutStore((s) => s.setStep)
  const storedCustomer = useCheckoutStore((s) => s.customerInfo)
  const storedShipping = useCheckoutStore((s) => s.shippingAddress)
  const setCustomerInfo = useCheckoutStore((s) => s.setCustomerInfo)
  const setShippingAddress = useCheckoutStore((s) => s.setShippingAddress)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quoteState, setQuoteState] = useState<QuoteState>({ status: 'idle' })

  // Estado para modal de confirmación cuando cambia el precio
  const [priceChangedData, setPriceChangedData] = useState<{
    oldCost: number
    newShippingCost: number
    newTotal: number
  } | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(CheckoutSchema),
    defaultValues: {
      customer: storedCustomer ?? undefined,
      shippingAddress: storedShipping ?? undefined,
      shippingMethod: 'andreani-domicilio',
      clientShippingCost: undefined,
    },
  })

  const postalCode = watch('shippingAddress.postalCode')
  const clientShippingCost = watch('clientShippingCost')
  const subtotal = totalPrice()
  const displayShippingCost = quoteState.status === 'success' ? quoteState.quote.price : 0
  const total = subtotal + displayShippingCost

  // Cotización en tiempo real al escribir el CP (debounce 600ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!CP_REGEX.test(postalCode ?? '')) {
      setQuoteState({ status: 'idle' })
      setValue('clientShippingCost', undefined)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setQuoteState({ status: 'loading' })
      setValue('clientShippingCost', undefined)

      try {
        const cartItems = items.map((i) => ({ variantId: i.variantId, quantity: i.quantity }))
        const res = await fetch('/api/shipping/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cp: postalCode, items: cartItems }),
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

        setQuoteState({ status: 'success', quote: data.quote })
        setValue('clientShippingCost', data.quote.price)
      } catch {
        setQuoteState({ status: 'error' })
      }
    }, 600)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [postalCode, items, setValue])

  const handleContinue = async () => {
    const valid = await trigger(STEP1_FIELDS as Parameters<typeof trigger>[0])
    if (valid) {
      const values = getValues()
      setCustomerInfo(values.customer)
      setShippingAddress(values.shippingAddress)
      setStep('review')
    }
  }

  async function submitOrder(overrideClientCost?: number) {
    if (items.length === 0) return
    setIsSubmitting(true)
    setError(null)

    const data = getValues()
    const costToSend = overrideClientCost ?? data.clientShippingCost

    try {
      const payload = {
        customer: data.customer,
        shipping: data.shippingAddress,
        items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
        shippingMethod: data.shippingMethod,
        clientShippingCost: costToSend,
      }

      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const body = await orderRes.json().catch(() => ({})) as {
        orderId?: string
        error?: string
        newShippingCost?: number
        newTotal?: number
      }

      if (orderRes.status === 409 && body.error === 'shipping_price_changed') {
        // El precio cambió — pedir confirmación al usuario antes de crear la orden
        setPriceChangedData({
          oldCost: costToSend ?? 0,
          newShippingCost: body.newShippingCost!,
          newTotal: body.newTotal!,
        })
        setIsSubmitting(false)
        return
      }

      if (!orderRes.ok) {
        throw new Error(body?.error ?? 'Error al crear el pedido')
      }

      router.push(`/checkout/confirmacion?orderId=${body.orderId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado')
      setIsSubmitting(false)
    }
  }

  const onSubmit = () => submitOrder()

  function handleConfirmNewPrice() {
    if (!priceChangedData) return
    const { newShippingCost } = priceChangedData
    setValue('clientShippingCost', newShippingCost)
    setPriceChangedData(null)
    submitOrder(newShippingCost)
  }

  const currentStep = stepToNumber(step)

  return (
    <>
      {/* Modal de confirmación de cambio de precio */}
      <AlertDialog open={!!priceChangedData} onOpenChange={(open) => !open && setPriceChangedData(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>El costo de envío cambió</AlertDialogTitle>
            <AlertDialogDescription>
              El precio de Andreani se actualizó mientras completabas el formulario.
              <br />
              <br />
              <span className="line-through text-muted-foreground">
                Envío anterior: {priceChangedData && formatPrice(priceChangedData.oldCost)}
              </span>
              <br />
              <strong>
                Envío actualizado: {priceChangedData && formatPrice(priceChangedData.newShippingCost)}
              </strong>
              <br />
              <strong>
                Total: {priceChangedData && formatPrice(priceChangedData.newTotal)}
              </strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmNewPrice}>
              Confirmar con nuevo precio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-8">
        <StepIndicator currentStep={currentStep} />

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <input type="hidden" {...register('shippingMethod')} />
          <input type="hidden" {...register('clientShippingCost', { valueAsNumber: true })} />

          {currentStep === 1 && (
            <div className="space-y-8">

              {/* ── Datos personales ── */}
              <section aria-labelledby="customer-heading">
                <h2 id="customer-heading" className="mb-4 text-lg font-semibold">Datos personales</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="name">Nombre completo</Label>
                    <Input id="name" autoComplete="name" {...register('customer.name')} aria-invalid={!!errors.customer?.name} />
                    {errors.customer?.name && <p className="text-xs text-destructive" role="alert">{errors.customer.name.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" autoComplete="email" {...register('customer.email')} aria-invalid={!!errors.customer?.email} />
                    {errors.customer?.email && <p className="text-xs text-destructive" role="alert">{errors.customer.email.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input id="phone" type="tel" autoComplete="tel" {...register('customer.phone')} aria-invalid={!!errors.customer?.phone} />
                    {errors.customer?.phone && <p className="text-xs text-destructive" role="alert">{errors.customer.phone.message}</p>}
                  </div>
                </div>
              </section>

              <Separator />

              {/* ── Dirección de envío ── */}
              <section aria-labelledby="shipping-heading">
                <h2 id="shipping-heading" className="mb-4 text-lg font-semibold">Dirección de envío</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="street">Calle y número</Label>
                    <Input id="street" autoComplete="street-address" {...register('shippingAddress.street')} aria-invalid={!!errors.shippingAddress?.street} />
                    {errors.shippingAddress?.street && <p className="text-xs text-destructive" role="alert">{errors.shippingAddress.street.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="city">Ciudad</Label>
                    <Input id="city" autoComplete="address-level2" {...register('shippingAddress.city')} aria-invalid={!!errors.shippingAddress?.city} />
                    {errors.shippingAddress?.city && <p className="text-xs text-destructive" role="alert">{errors.shippingAddress.city.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="province">Provincia</Label>
                    <Input id="province" autoComplete="address-level1" {...register('shippingAddress.province')} aria-invalid={!!errors.shippingAddress?.province} />
                    {errors.shippingAddress?.province && <p className="text-xs text-destructive" role="alert">{errors.shippingAddress.province.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="postalCode">Código postal</Label>
                    <Input id="postalCode" autoComplete="postal-code" {...register('shippingAddress.postalCode')} aria-invalid={!!errors.shippingAddress?.postalCode} />
                    {errors.shippingAddress?.postalCode && <p className="text-xs text-destructive" role="alert">{errors.shippingAddress.postalCode.message}</p>}
                  </div>
                </div>
              </section>

              <Separator />

              {/* ── Envío Andreani ── */}
              <section aria-labelledby="shipping-cost-heading">
                <h2 id="shipping-cost-heading" className="mb-4 text-lg font-semibold">Envío a domicilio</h2>

                {quoteState.status === 'loading' && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cotizando envío para CP {postalCode}…
                  </div>
                )}

                {quoteState.status === 'unresolvable' && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    Algún producto del carrito no tiene embalaje configurado. Consultanos por WhatsApp para cotizar el envío.
                  </div>
                )}

                {quoteState.status === 'error' && (
                  <p className="text-sm text-destructive py-2">No se pudo cotizar el envío. Reintentá.</p>
                )}

                {quoteState.status === 'success' && (
                  <div className="rounded-lg border border-primary bg-primary/5 p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Andreani — envío a domicilio</p>
                      <p className="text-xs text-muted-foreground">{quoteState.quote.estimatedDays}</p>
                    </div>
                    <span className="font-semibold">{formatPrice(quoteState.quote.price)}</span>
                  </div>
                )}

                {quoteState.status === 'idle' && (
                  <p className="text-sm text-muted-foreground py-2">
                    Completá el código postal para ver el costo de envío.
                  </p>
                )}
              </section>

              <Button
                type="button"
                size="lg"
                className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                onClick={handleContinue}
                disabled={quoteState.status === 'loading' || quoteState.status === 'unresolvable'}
              >
                Continuar al pago →
              </Button>
            </div>
          )}

          {/* ── Paso 2: Revisión ── */}
          {currentStep === 2 && (
            <div className="space-y-8">
              <section aria-labelledby="summary-heading">
                <h2 id="summary-heading" className="mb-4 text-lg font-semibold">Resumen del pedido</h2>
                <div className="space-y-2 text-sm">
                  {items.map((item) => (
                    <div key={item.variantId} className="flex justify-between">
                      <span className="text-muted-foreground">{item.name} × {item.quantity}</span>
                      <span>{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  <Separator className="my-3" />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Envío</span>
                    <span>
                      {displayShippingCost === 0
                        ? <span className="text-muted-foreground text-xs">Se calculará al confirmar</span>
                        : formatPrice(displayShippingCost)
                      }
                    </span>
                  </div>
                  <Separator className="my-3" />
                  <div className="flex justify-between text-base font-semibold">
                    <span>Total estimado</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    El total definitivo se confirma al procesar el pedido.
                  </p>
                </div>
              </section>

              {error && (
                <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <Button type="button" variant="outline" size="lg" className="flex-1" onClick={() => setStep('shipping')} disabled={isSubmitting}>
                  ← Volver
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  className="flex-[2] bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                  disabled={isSubmitting || items.length === 0}
                >
                  {isSubmitting ? 'Procesando...' : 'Confirmar pedido'}
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>
    </>
  )
}
