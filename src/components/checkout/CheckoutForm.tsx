'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const WA_NUMBER = '5491139510032'

const FORM_FIELDS: (
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

function buildWhatsAppMessage(params: {
  orderId: string
  customer: { name: string; email: string; phone: string }
  shippingAddress: { street: string; city: string; province: string; postalCode: string }
  items: Array<{ name: string; quantity: number; price: number }>
  observations?: string
  subtotal: number
}): string {
  const { orderId, customer, shippingAddress, items, observations, subtotal } = params
  const provinceName =
    AR_PROVINCES_LIST.find((p) => p.code === shippingAddress.province)?.name ??
    shippingAddress.province

  const lines = [
    'Hola Ayla! Quisiera hacer un pedido.',
    '',
    `*Pedido #${orderId}*`,
    '',
    '*Mis datos*',
    `Nombre: ${customer.name}`,
    `Email: ${customer.email}`,
    `Teléfono: ${customer.phone}`,
    '',
    '*Productos*',
    ...items.map((i) => `• ${i.name} × ${i.quantity} — ${formatPrice(i.price * i.quantity)}`),
    `Subtotal: ${formatPrice(subtotal)}`,
    '',
    '*Dirección de envío*',
    shippingAddress.street,
    `${shippingAddress.city}, ${provinceName}`,
    `CP: ${shippingAddress.postalCode}`,
  ]

  if (observations) {
    lines.push('', `*Observaciones:* ${observations}`)
  }

  lines.push('', 'Quedo a la espera para coordinar el envío y el pago. Gracias!')

  return lines.join('\n')
}

export function CheckoutForm() {
  const router = useRouter()
  const items = useCartStore((s) => s.items)
  const totalPrice = useCartStore((s) => s.totalPrice)

  const storedCustomer = useCheckoutStore((s) => s.customerInfo)
  const storedShipping = useCheckoutStore((s) => s.shippingAddress)
  const setCustomerInfo = useCheckoutStore((s) => s.setCustomerInfo)
  const setShippingAddress = useCheckoutStore((s) => s.setShippingAddress)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    trigger,
    getValues,
    watch,
    control,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(CheckoutSchema),
    defaultValues: {
      customer: storedCustomer ?? undefined,
      shippingAddress: storedShipping ?? undefined,
      shippingMethod: 'andreani-domicilio',
      paymentMethod: 'transfer',
      clientShippingCost: undefined,
    },
  })

  const observations = watch('observations')

  const handleWhatsApp = async () => {
    const valid = await trigger(FORM_FIELDS as Parameters<typeof trigger>[0])
    if (!valid) return

    setIsSubmitting(true)
    setError(null)

    const data = getValues()
    setCustomerInfo(data.customer)
    setShippingAddress(data.shippingAddress)

    try {
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: data.customer,
          shipping: data.shippingAddress,
          items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
          shippingMethod: data.shippingMethod,
          observations: data.observations,
        }),
      })

      const body = await orderRes.json().catch(() => ({})) as { orderId?: string; error?: string }

      if (!orderRes.ok) {
        throw new Error(body?.error ?? 'Error al crear el pedido')
      }

      const message = buildWhatsAppMessage({
        orderId: body.orderId!,
        customer: data.customer,
        shippingAddress: data.shippingAddress,
        items: items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
        observations: data.observations,
        subtotal: totalPrice(),
      })

      window.open(
        `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`,
        '_blank',
        'noopener,noreferrer',
      )

      router.push(`/checkout/confirmacion?orderId=${body.orderId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={(e) => e.preventDefault()} noValidate>
        <input type="hidden" {...register('shippingMethod')} />
        <input type="hidden" {...register('paymentMethod')} />

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

          {error && (
            <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button
            type="button"
            size="lg"
            className="w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold"
            onClick={handleWhatsApp}
            disabled={isSubmitting || items.length === 0}
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            {isSubmitting ? 'Procesando...' : 'Pedilo por WhatsApp'}
          </Button>
        </div>
      </form>
    </div>
  )
}
