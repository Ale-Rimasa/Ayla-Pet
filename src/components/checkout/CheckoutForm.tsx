'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/store/cart.store'
import { useCheckoutStore } from '@/store/checkout.store'
import { CheckoutSchema } from '@/lib/validations'
import type { CheckoutFormValues } from '@/lib/validations'
import { formatPrice } from '@/lib/utils'
import { AR_PROVINCES_LIST } from '@/lib/constants'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { StepIndicator } from '@/components/checkout/StepIndicator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
]

function stepToNumber(step: 'shipping' | 'review' | 'payment'): 1 | 2 {
  return step === 'shipping' ? 1 : 2
}

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

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(CheckoutSchema),
    defaultValues: {
      customer: storedCustomer ?? undefined,
      shippingAddress: storedShipping ?? undefined,
      shippingMethod: 'andreani-domicilio',
      paymentMethod: 'mercadopago',
      clientShippingCost: undefined,
    },
  })

  const observations = watch('observations')
  const paymentMethod = watch('paymentMethod')
  const clientShippingCost = watch('clientShippingCost')
  const subtotal = totalPrice()
  const displayShippingCost = clientShippingCost ?? 0
  const total = subtotal + displayShippingCost

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
        observations: data.observations,
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
        setValue('clientShippingCost', body.newShippingCost)
        setIsSubmitting(false)
        submitOrder(body.newShippingCost)
        return
      }

      if (!orderRes.ok) {
        throw new Error(body?.error ?? 'Error al crear el pedido')
      }

      const selectedPayment = getValues('paymentMethod')

      if (selectedPayment === 'mercadopago') {
        const prefRes = await fetch('/api/payments/preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: body.orderId }),
        })
        const prefBody = await prefRes.json().catch(() => ({})) as { initPoint?: string; error?: string }
        if (!prefRes.ok || !prefBody.initPoint) {
          throw new Error(prefBody.error ?? 'Error al iniciar el pago')
        }
        window.location.href = prefBody.initPoint
        return
      }

      router.push(`/checkout/confirmacion?orderId=${body.orderId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado')
      setIsSubmitting(false)
    }
  }

  const onSubmit = () => submitOrder()

  const currentStep = stepToNumber(step)

  return (
    <div className="space-y-8">
      <StepIndicator currentStep={currentStep} />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <input type="hidden" {...register('shippingMethod')} />
        <input type="hidden" {...register('paymentMethod')} />
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
                  <Controller
                    control={control}
                    name="shippingAddress.province"
                    render={({ field }) => (
                      <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <SelectTrigger
                          id="province"
                          className="w-full"
                          aria-invalid={!!errors.shippingAddress?.province}
                        >
                          <SelectValue placeholder="Seleccioná una provincia" />
                        </SelectTrigger>
                        <SelectContent>
                          {AR_PROVINCES_LIST.map(({ name, code }) => (
                            <SelectItem key={code} value={code}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.shippingAddress?.province && (
                    <p className="text-xs text-destructive" role="alert">{errors.shippingAddress.province.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="postalCode">Código postal</Label>
                  <Input id="postalCode" autoComplete="postal-code" {...register('shippingAddress.postalCode')} aria-invalid={!!errors.shippingAddress?.postalCode} />
                  {errors.shippingAddress?.postalCode && <p className="text-xs text-destructive" role="alert">{errors.shippingAddress.postalCode.message}</p>}
                </div>
              </div>
            </section>

            <Separator />

            {/* ── Observaciones ── */}
            <section aria-labelledby="observations-heading">
              <h2 id="observations-heading" className="mb-4 text-lg font-semibold">
                Observaciones{' '}
                <span className="text-sm font-normal text-muted-foreground">(opcional)</span>
              </h2>
              <div className="space-y-1.5">
                <Label htmlFor="observations">Indicaciones para la entrega</Label>
                <Textarea
                  id="observations"
                  placeholder="Casa con rejas negras"
                  maxLength={80}
                  {...register('observations')}
                  aria-invalid={!!errors.observations}
                />
                <div className="flex justify-between items-center">
                  {errors.observations
                    ? <p className="text-xs text-destructive" role="alert">{errors.observations.message}</p>
                    : <span />
                  }
                  <p className="text-xs text-muted-foreground text-right">{(observations ?? '').length}/80</p>
                </div>
              </div>
            </section>

            <Button
              type="button"
              size="lg"
              className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground"
              onClick={handleContinue}
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

            {/* ── Método de pago ── */}
            <section aria-labelledby="payment-heading">
              <h2 id="payment-heading" className="mb-4 text-lg font-semibold">Método de pago</h2>
              <div className="space-y-3">
                <label
                  className={`flex items-center gap-4 rounded-lg border p-4 cursor-pointer transition-colors ${
                    paymentMethod === 'mercadopago'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <input
                    type="radio"
                    className="accent-primary"
                    checked={paymentMethod === 'mercadopago'}
                    onChange={() => setValue('paymentMethod', 'mercadopago')}
                  />
                  <div>
                    <p className="font-medium text-sm">MercadoPago</p>
                    <p className="text-xs text-muted-foreground">Tarjeta de crédito, débito o saldo MP</p>
                  </div>
                </label>
                <label
                  className={`flex items-center gap-4 rounded-lg border p-4 cursor-pointer transition-colors ${
                    paymentMethod === 'transfer'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <input
                    type="radio"
                    className="accent-primary"
                    checked={paymentMethod === 'transfer'}
                    onChange={() => setValue('paymentMethod', 'transfer')}
                  />
                  <div>
                    <p className="font-medium text-sm">Transferencia bancaria</p>
                    <p className="text-xs text-muted-foreground">Te enviamos los datos por email</p>
                  </div>
                </label>
              </div>
            </section>

            {error && (
              <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => setStep('shipping')}
                disabled={isSubmitting}
              >
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
  )
}
