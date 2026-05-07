import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CustomerInfo, ShippingAddress } from '@/types'

type CheckoutStep = 'shipping' | 'review' | 'payment'

interface CheckoutState {
  customerInfo: CustomerInfo | null
  shippingAddress: ShippingAddress | null
  step: CheckoutStep
  setCustomerInfo: (info: CustomerInfo) => void
  setShippingAddress: (address: ShippingAddress) => void
  setStep: (step: CheckoutStep) => void
  resetCheckout: () => void
}

const initialState = {
  customerInfo: null,
  shippingAddress: null,
  step: 'shipping' as CheckoutStep,
}

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      ...initialState,

      setCustomerInfo: (info) => set({ customerInfo: info }),
      setShippingAddress: (address) => set({ shippingAddress: address }),
      setStep: (step) => set({ step }),
      resetCheckout: () => set(initialState),
    }),
    {
      name: 'jengibre-checkout',
      skipHydration: true,
    }
  )
)
