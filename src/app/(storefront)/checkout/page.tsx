import type { Metadata } from 'next'
import { CheckoutForm } from '@/components/checkout/CheckoutForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false },
}

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-10 font-heading text-2xl font-bold text-center">
        Finalizar compra
      </h1>
      {/* StepIndicator is managed internally by CheckoutForm */}
      <CheckoutForm />
    </div>
  )
}
