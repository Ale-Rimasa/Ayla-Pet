'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MessageCircle, Plus, Trash2 } from 'lucide-react'
import Image from 'next/image'
import { useCartStore } from '@/store/cart.store'
import { useCheckoutStore } from '@/store/checkout.store'
import { CheckoutSchema } from '@/lib/validations'
import type { CheckoutFormValues } from '@/lib/validations'
import { formatPrice } from '@/lib/utils'
import { AR_PROVINCES_LIST } from '@/lib/constants'
import { uploadOrderReferencePhoto } from '@/lib/actions/order-photos'
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
} from '@/components/ui/select'

const WA_NUMBER = '5491125412608'

// CP argentino: 4–8 dígitos (mismo formato que valida /api/shipping/quote)
const CP_REGEX = /^\d{4,8}$/
const QUOTE_DEBOUNCE_MS = 600

interface CorreoArgentinoQuote {
  aDomicilioCentavos: number
  aSucursalCentavos: number
  aDomicilioDiasMin?: string
  aDomicilioDiasMax?: string
  aSucursalDiasMin?: string
  aSucursalDiasMax?: string
}

const SHIPPING_LABELS: Record<string, string> = {
  'correo-argentino-domicilio': 'Correo Argentino a domicilio',
  'correo-argentino-sucursal': 'Correo Argentino a sucursal',
}

const MAX_PHOTOS = 3
const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

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
  shippingLabel: string
  shippingCost?: number
}): string {
  const { orderId, customer, shippingAddress, items, observations, subtotal, shippingLabel, shippingCost } = params
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
    '*Envío*',
    shippingLabel,
    shippingCost !== undefined
      ? `Costo: ${formatPrice(shippingCost)}`
      : 'Costo: a confirmar',
    shippingCost !== undefined
      ? `*Total: ${formatPrice(subtotal + shippingCost)}*`
      : `*Total: ${formatPrice(subtotal)} + envío*`,
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

interface PhotoPreview {
  file: File
  objectUrl: string
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

  // Cotización de envío en vivo (Correo Argentino)
  const [quote, setQuote] = useState<CorreoArgentinoQuote | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError] = useState<string | null>(null)

  // Photo state — held outside RHF (File is not serializable/SSR-safe for Zod)
  const [photos, setPhotos] = useState<PhotoPreview[]>([])
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [photoNotice, setPhotoNotice] = useState<string | null>(null)
  const [photoFailOrderId, setPhotoFailOrderId] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

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
      shippingMethod: 'correo-argentino-domicilio',
      paymentMethod: 'transfer',
      clientShippingCost: undefined,
    },
  })

  const observations = watch('observations')
  const engravingText = watch('engravingText')
  const postalCode = watch('shippingAddress.postalCode')
  const province = watch('shippingAddress.province')
  const shippingMethod = watch('shippingMethod')

  const subtotal = totalPrice()
  const selectedShippingCost = quote
    ? shippingMethod === 'correo-argentino-sucursal'
      ? quote.aSucursalCentavos
      : quote.aDomicilioCentavos
    : undefined

  // ── Cotización de envío ────────────────────────────────────────────────────

  const fetchQuote = useCallback(async (cp: string, prov: string) => {
    setQuoteLoading(true)
    setQuoteError(null)
    try {
      const res = await fetch('/api/shipping/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cp,
          provincia: prov,
          items: useCartStore.getState().items.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
          })),
        }),
      })

      if (!res.ok) {
        setQuote(null)
        setQuoteError('No pudimos cotizar el envío. El costo se confirma por WhatsApp.')
        return
      }

      const data = await res.json() as { correoArgentino?: CorreoArgentinoQuote }
      if (data.correoArgentino) {
        setQuote(data.correoArgentino)
      } else {
        setQuote(null)
        setQuoteError('No pudimos cotizar el envío. El costo se confirma por WhatsApp.')
      }
    } catch {
      setQuote(null)
      setQuoteError('No pudimos cotizar el envío. El costo se confirma por WhatsApp.')
    } finally {
      setQuoteLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!CP_REGEX.test(postalCode ?? '') || !province || items.length === 0) {
      setQuote(null)
      setQuoteError(null)
      return
    }

    const timer = setTimeout(() => {
      void fetchQuote(postalCode, province)
    }, QUOTE_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [postalCode, province, items, fetchQuote])

  // ── Photo helpers ──────────────────────────────────────────────────────────

  const handleAddClick = useCallback(() => {
    if (photos.length >= MAX_PHOTOS) {
      setPhotoError('Máximo 3 fotos')
      return
    }
    photoInputRef.current?.click()
  }, [photos.length])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      // Reset so the same file can be re-selected if needed
      e.target.value = ''
      if (!file) return

      if (photos.length >= MAX_PHOTOS) {
        setPhotoError('Máximo 3 fotos')
        return
      }
      if (!ALLOWED_MIME.includes(file.type)) {
        setPhotoError('Solo se aceptan fotos JPEG, PNG, WebP o AVIF.')
        return
      }
      if (file.size > MAX_SIZE || file.size === 0) {
        setPhotoError('El archivo supera los 5 MB.')
        return
      }

      setPhotoError(null)
      const objectUrl = URL.createObjectURL(file)
      setPhotos((prev) => [...prev, { file, objectUrl }])
    },
    [photos.length]
  )

  const handleRemovePhoto = useCallback((index: number) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].objectUrl)
      return prev.filter((_, i) => i !== index)
    })
    setPhotoError(null)
  }, [])

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleWhatsApp = async () => {
    const valid = await trigger(FORM_FIELDS as Parameters<typeof trigger>[0])
    if (!valid) return

    setIsSubmitting(true)
    setError(null)
    setPhotoNotice(null)
    setPhotoFailOrderId(null)

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
          ...(selectedShippingCost !== undefined ? { clientShippingCost: selectedShippingCost } : {}),
          observations: data.observations,
          engravingText: data.engravingText || undefined,
        }),
      })

      const body = await orderRes.json().catch(() => ({})) as {
        orderId?: string
        error?: string
        newShippingCost?: number
      }

      if (orderRes.status === 409 && body?.error === 'shipping_price_changed') {
        // El costo cambió entre la cotización y el pedido: refrescamos y pedimos reconfirmar
        await fetchQuote(data.shippingAddress.postalCode, data.shippingAddress.province)
        setError('El costo de envío se actualizó. Revisalo y volvé a confirmar el pedido.')
        setIsSubmitting(false)
        return
      }

      if (!orderRes.ok) {
        throw new Error(body?.error ?? 'Error al crear el pedido')
      }

      const orderId = body.orderId!

      // Upload photos sequentially — failures are non-blocking
      if (photos.length > 0) {
        const failures: number[] = []
        for (let i = 0; i < photos.length; i++) {
          const fd = new FormData()
          fd.append('orderId', orderId)
          fd.append('file', photos[i].file)
          const r = await uploadOrderReferencePhoto(fd)
          if (!r.ok) failures.push(i)
        }
        if (failures.length > 0) {
          setPhotoNotice(`No se pudieron subir ${failures.length} foto(s).`)
          setPhotoFailOrderId(orderId)
        }
      }

      const message = buildWhatsAppMessage({
        orderId,
        customer: data.customer,
        shippingAddress: data.shippingAddress,
        items: items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
        observations: data.observations,
        subtotal: totalPrice(),
        shippingLabel: SHIPPING_LABELS[data.shippingMethod] ?? data.shippingMethod,
        shippingCost: selectedShippingCost,
      })

      window.open(
        `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`,
        '_blank',
        'noopener,noreferrer',
      )

      router.push(`/checkout/confirmacion?orderId=${orderId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={(e) => e.preventDefault()} noValidate>
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
                <Input id="phone" type="tel" autoComplete="tel" maxLength={10} {...register('customer.phone')} aria-invalid={!!errors.customer?.phone} />
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
                        <span className={!field.value ? 'text-sm text-muted-foreground' : 'text-sm'}>
                          {field.value
                            ? AR_PROVINCES_LIST.find((p) => p.code === field.value)?.name
                            : 'Seleccioná una provincia'}
                        </span>
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

          {/* ── Método de envío ── */}
          <section aria-labelledby="shipping-method-heading">
            <h2 id="shipping-method-heading" className="mb-4 text-lg font-semibold">Método de envío</h2>

            {!quote && !quoteLoading && !quoteError && (
              <p className="text-sm text-muted-foreground">
                Completá el código postal y la provincia para ver el costo de envío.
              </p>
            )}

            {quoteLoading && (
              <p className="text-sm text-muted-foreground" role="status">Cotizando envío...</p>
            )}

            {quoteError && (
              <p className="text-sm text-amber-700" role="alert">{quoteError}</p>
            )}

            <div className="mt-2 space-y-3">
              <label
                htmlFor="shipping-domicilio"
                className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    id="shipping-domicilio"
                    value="correo-argentino-domicilio"
                    {...register('shippingMethod')}
                    className="h-4 w-4 accent-primary"
                  />
                  <span>
                    <span className="block text-sm font-medium">Correo Argentino a domicilio</span>
                    {quote?.aDomicilioDiasMin && quote?.aDomicilioDiasMax && (
                      <span className="block text-xs text-muted-foreground">
                        {quote.aDomicilioDiasMin}–{quote.aDomicilioDiasMax} días hábiles
                      </span>
                    )}
                  </span>
                </span>
                <span className="text-sm font-semibold">
                  {quote ? formatPrice(quote.aDomicilioCentavos) : '—'}
                </span>
              </label>

              <label
                htmlFor="shipping-sucursal"
                className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    id="shipping-sucursal"
                    value="correo-argentino-sucursal"
                    {...register('shippingMethod')}
                    className="h-4 w-4 accent-primary"
                  />
                  <span>
                    <span className="block text-sm font-medium">Correo Argentino a sucursal</span>
                    {quote?.aSucursalDiasMin && quote?.aSucursalDiasMax && (
                      <span className="block text-xs text-muted-foreground">
                        {quote.aSucursalDiasMin}–{quote.aSucursalDiasMax} días hábiles
                      </span>
                    )}
                  </span>
                </span>
                <span className="text-sm font-semibold">
                  {quote ? formatPrice(quote.aSucursalCentavos) : '—'}
                </span>
              </label>
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

          <Separator />

          {/* ── Personalización ── */}
          <section aria-labelledby="personalization-heading">
            <h2 id="personalization-heading" className="mb-4 text-lg font-semibold">
              Personalización{' '}
              <span className="text-sm font-normal text-muted-foreground">(opcional)</span>
            </h2>

            {/* Engraving text field */}
            <div className="space-y-1.5 mb-6">
              <Label htmlFor="engravingText">Agregar frase, nombre o fecha a grabar</Label>
              <Input
                id="engravingText"
                placeholder="Ej: Tobías 2024"
                maxLength={20}
                {...register('engravingText')}
                aria-invalid={!!errors.engravingText}
              />
              <div className="flex justify-between items-center">
                {errors.engravingText
                  ? <p className="text-xs text-destructive" role="alert">{errors.engravingText.message}</p>
                  : <span />
                }
                <p className="text-xs text-muted-foreground text-right">{(engravingText ?? '').length}/20</p>
              </div>
            </div>

            {/* Photo picker */}
            <div className="space-y-3">
              <Label>Fotos de referencia</Label>
              <p className="text-xs text-muted-foreground">
                Podés subir hasta 3 fotos como referencia para el grabado.
              </p>

              <div className="grid grid-cols-3 gap-3">
                {photos.map((photo, idx) => (
                  <div
                    key={photo.objectUrl}
                    className="relative aspect-square overflow-hidden rounded-xl border border-border bg-muted"
                  >
                    <Image
                      src={photo.objectUrl}
                      alt={`Foto de referencia ${idx + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 33vw, 20vw"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      aria-label="Eliminar foto"
                      className="absolute right-1 top-1 rounded-full bg-destructive p-1.5 text-destructive-foreground shadow-sm transition-opacity hover:opacity-90"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                {photos.length < MAX_PHOTOS && (
                  <button
                    type="button"
                    onClick={handleAddClick}
                    className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/50 transition-colors hover:border-primary/50 hover:bg-muted"
                    aria-label="Agregar foto"
                  >
                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                      <Plus className="h-5 w-5" />
                      <span className="text-xs font-medium">Agregar</span>
                    </div>
                  </button>
                )}
              </div>

              {photoError && (
                <p className="text-xs text-destructive" role="alert">{photoError}</p>
              )}

              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="sr-only"
                onChange={handleFileChange}
                aria-hidden="true"
              />

              <p className="text-xs text-muted-foreground">
                {photos.length} de {MAX_PHOTOS} fotos seleccionadas
              </p>
            </div>
          </section>

          {/* ── Non-blocking photo notice ── */}
          {photoNotice && (
            <div
              className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800"
              role="alert"
            >
              {photoNotice}{' '}
              {photoFailOrderId && (
                <Link
                  href={`/mi-pedido/${photoFailOrderId}/fotos`}
                  className="underline font-medium"
                >
                  Podés agregarlas acá
                </Link>
              )}
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {/* ── Resumen ── */}
          <section aria-labelledby="summary-heading" className="rounded-lg border p-4">
            <h2 id="summary-heading" className="mb-3 text-lg font-semibold">Resumen</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{formatPrice(subtotal)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Envío</dt>
                <dd>
                  {selectedShippingCost !== undefined
                    ? formatPrice(selectedShippingCost)
                    : 'A calcular'}
                </dd>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-base font-semibold">
                <dt>Total</dt>
                <dd>
                  {selectedShippingCost !== undefined
                    ? formatPrice(subtotal + selectedShippingCost)
                    : `${formatPrice(subtotal)} + envío`}
                </dd>
              </div>
            </dl>
          </section>

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
