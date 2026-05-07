'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCartStore } from '@/store/cart.store'
import { formatPrice } from '@/lib/utils'
import { SHIPPING_COSTS } from '@/lib/constants'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { StepIndicator } from '@/components/checkout/StepIndicator'

const checkoutSchema = z.object({
  customer: z.object({
    name: z.string().min(2, 'Ingresá tu nombre completo'),
    email: z.string().email('Email inválido'),
    phone: z.string().min(8, 'Ingresá un teléfono válido'),
  }),
  shippingAddress: z.object({
    street: z.string().min(3, 'Ingresá la dirección'),
    city: z.string().min(2, 'Ingresá la ciudad'),
    province: z.string().min(2, 'Ingresá la provincia'),
    postalCode: z.string().min(4, 'Ingresá el código postal'),
  }),
  shippingMethod: z.enum(['standard', 'express', 'pickup']),
})

type CheckoutFormValues = z.infer<typeof checkoutSchema>

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

export function CheckoutForm() {
  const router = useRouter()
  const items = useCartStore((s) => s.items)
  const totalPrice = useCartStore((s) => s.totalPrice)
  const [step, setStep] = useState<1 | 2>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      shippingMethod: 'standard',
    },
  })

  const shippingMethod = watch('shippingMethod')
  const shippingCost = SHIPPING_COSTS[shippingMethod] ?? 0
  const subtotal = totalPrice()
  const total = subtotal + shippingCost

  const handleContinue = async () => {
    const valid = await trigger(STEP1_FIELDS as Parameters<typeof trigger>[0])
    if (valid) setStep(2)
  }

  const onSubmit = async (data: CheckoutFormValues) => {
    if (items.length === 0) return
    setIsSubmitting(true)
    setError(null)

    try {
      const payload = {
        customer: data.customer,
        shipping: data.shippingAddress,
        items: items.map((i) => ({
          variantId: i.variantId,
          quantity: i.quantity,
        })),
        shippingMethod: data.shippingMethod,
        clientTotal: total,
      }

      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!orderRes.ok) {
        const body = await orderRes.json().catch(() => ({}))
        throw new Error(body?.error ?? 'Error al crear el pedido')
      }

      const { orderId } = await orderRes.json()

      const prefRes = await fetch('/api/payments/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })

      if (!prefRes.ok) {
        const body = await prefRes.json().catch(() => ({}))
        throw new Error(body?.error ?? 'Error al iniciar el pago')
      }

      const { initPoint } = await prefRes.json()
      router.push(initPoint)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      <StepIndicator currentStep={step} />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {step === 1 && (
          <div className="space-y-8">
            <section aria-labelledby="customer-heading">
              <h2 id="customer-heading" className="mb-4 text-lg font-semibold">
                Datos personales
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="name">Nombre completo</Label>
                  <Input
                    id="name"
                    autoComplete="name"
                    {...register('customer.name')}
                    aria-invalid={!!errors.customer?.name}
                  />
                  {errors.customer?.name && (
                    <p className="text-xs text-destructive" role="alert">
                      {errors.customer.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    {...register('customer.email')}
                    aria-invalid={!!errors.customer?.email}
                  />
                  {errors.customer?.email && (
                    <p className="text-xs text-destructive" role="alert">
                      {errors.customer.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    {...register('customer.phone')}
                    aria-invalid={!!errors.customer?.phone}
                  />
                  {errors.customer?.phone && (
                    <p className="text-xs text-destructive" role="alert">
                      {errors.customer.phone.message}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <Separator />

            <section aria-labelledby="shipping-heading">
              <h2 id="shipping-heading" className="mb-4 text-lg font-semibold">
                Dirección de envío
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="street">Calle y número</Label>
                  <Input
                    id="street"
                    autoComplete="street-address"
                    {...register('shippingAddress.street')}
                    aria-invalid={!!errors.shippingAddress?.street}
                  />
                  {errors.shippingAddress?.street && (
                    <p className="text-xs text-destructive" role="alert">
                      {errors.shippingAddress.street.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city">Ciudad</Label>
                  <Input
                    id="city"
                    autoComplete="address-level2"
                    {...register('shippingAddress.city')}
                    aria-invalid={!!errors.shippingAddress?.city}
                  />
                  {errors.shippingAddress?.city && (
                    <p className="text-xs text-destructive" role="alert">
                      {errors.shippingAddress.city.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="province">Provincia</Label>
                  <Input
                    id="province"
                    autoComplete="address-level1"
                    {...register('shippingAddress.province')}
                    aria-invalid={!!errors.shippingAddress?.province}
                  />
                  {errors.shippingAddress?.province && (
                    <p className="text-xs text-destructive" role="alert">
                      {errors.shippingAddress.province.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="postalCode">Código postal</Label>
                  <Input
                    id="postalCode"
                    autoComplete="postal-code"
                    {...register('shippingAddress.postalCode')}
                    aria-invalid={!!errors.shippingAddress?.postalCode}
                  />
                  {errors.shippingAddress?.postalCode && (
                    <p className="text-xs text-destructive" role="alert">
                      {errors.shippingAddress.postalCode.message}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <Separator />

            <section aria-labelledby="method-heading">
              <h2 id="method-heading" className="mb-4 text-lg font-semibold">
                Método de envío
              </h2>
              <div className="space-y-3">
                {(
                  [
                    { key: 'standard', label: 'Correo Argentino (3–7 días)' },
                    { key: 'express', label: 'Andreani Express (1–2 días)' },
                    { key: 'pickup', label: 'Retiro en taller' },
                  ] as const
                ).map(({ key, label }) => (
                  <label
                    key={key}
                    className={`flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors ${
                      shippingMethod === key
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        value={key}
                        {...register('shippingMethod')}
                        className="accent-primary"
                      />
                      <span className="font-medium">{label}</span>
                    </div>
                    <span className={`font-semibold ${key === 'pickup' ? 'text-secondary' : ''}`}>
                      {SHIPPING_COSTS[key] === 0 ? 'Gratis' : formatPrice(SHIPPING_COSTS[key])}
                    </span>
                  </label>
                ))}
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

        {step === 2 && (
          <div className="space-y-8">
            <section aria-labelledby="summary-heading">
              <h2 id="summary-heading" className="mb-4 text-lg font-semibold">
                Resumen del pedido
              </h2>
              <div className="space-y-2 text-sm">
                {items.map((item) => (
                  <div key={item.variantId} className="flex justify-between">
                    <span className="text-muted-foreground">
                      {item.name} × {item.quantity}
                    </span>
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
                  <span>{shippingCost === 0 ? 'Gratis' : formatPrice(shippingCost)}</span>
                </div>
                <Separator className="my-3" />
                <div className="flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
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
                onClick={() => setStep(1)}
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
                {isSubmitting ? 'Procesando...' : `Pagar ${formatPrice(total)}`}
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
