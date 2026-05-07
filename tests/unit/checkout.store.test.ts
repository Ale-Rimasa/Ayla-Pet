import { describe, it, expect, beforeEach } from 'vitest'
import { useCheckoutStore } from '@/store/checkout.store'
import type { CustomerInfo, ShippingAddress } from '@/types'

const customer: CustomerInfo = {
  name: 'Ana García',
  email: 'ana@example.com',
  phone: '+5491112345678',
}

const address: ShippingAddress = {
  street: 'Av. Corrientes 1234',
  city: 'Buenos Aires',
  province: 'CABA',
  postalCode: 'C1043',
}

beforeEach(() => {
  useCheckoutStore.getState().resetCheckout()
})

describe('checkout store — initial state', () => {
  it('customerInfo is null', () => {
    expect(useCheckoutStore.getState().customerInfo).toBeNull()
  })

  it('shippingAddress is null', () => {
    expect(useCheckoutStore.getState().shippingAddress).toBeNull()
  })

  it('step is "shipping"', () => {
    expect(useCheckoutStore.getState().step).toBe('shipping')
  })
})

describe('setCustomerInfo', () => {
  it('stores the customer info object', () => {
    useCheckoutStore.getState().setCustomerInfo(customer)
    expect(useCheckoutStore.getState().customerInfo).toEqual(customer)
  })
})

describe('setShippingAddress', () => {
  it('stores the shipping address object', () => {
    useCheckoutStore.getState().setShippingAddress(address)
    expect(useCheckoutStore.getState().shippingAddress).toEqual(address)
  })
})

describe('setStep', () => {
  it('updates step to "review"', () => {
    useCheckoutStore.getState().setStep('review')
    expect(useCheckoutStore.getState().step).toBe('review')
  })

  it('updates step to "payment"', () => {
    useCheckoutStore.getState().setStep('payment')
    expect(useCheckoutStore.getState().step).toBe('payment')
  })

  it('can cycle through all steps', () => {
    const { setStep } = useCheckoutStore.getState()
    setStep('review')
    expect(useCheckoutStore.getState().step).toBe('review')
    setStep('payment')
    expect(useCheckoutStore.getState().step).toBe('payment')
    setStep('shipping')
    expect(useCheckoutStore.getState().step).toBe('shipping')
  })
})

describe('resetCheckout', () => {
  it('resets customerInfo to null', () => {
    useCheckoutStore.getState().setCustomerInfo(customer)
    useCheckoutStore.getState().resetCheckout()
    expect(useCheckoutStore.getState().customerInfo).toBeNull()
  })

  it('resets shippingAddress to null', () => {
    useCheckoutStore.getState().setShippingAddress(address)
    useCheckoutStore.getState().resetCheckout()
    expect(useCheckoutStore.getState().shippingAddress).toBeNull()
  })

  it('resets step to "shipping"', () => {
    useCheckoutStore.getState().setStep('payment')
    useCheckoutStore.getState().resetCheckout()
    expect(useCheckoutStore.getState().step).toBe('shipping')
  })
})
