import { describe, it, expect } from 'vitest'
import { CheckoutSchema } from '@/lib/validations'

const validData = {
  customer: {
    name: 'Ana García',
    email: 'ana@example.com',
    phone: '1112345678',
  },
  shippingAddress: {
    street: 'Av. Corrientes 1234',
    city: 'CABA',
    province: 'Buenos Aires',
    postalCode: '1043',
  },
  shippingMethod: 'standard' as const,
}

describe('CheckoutSchema', () => {
  it('accepts a fully valid checkout payload', () => {
    const result = CheckoutSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('rejects customer.name shorter than 2 characters', () => {
    const result = CheckoutSchema.safeParse({
      ...validData,
      customer: { ...validData.customer, name: 'A' },
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const nameError = result.error.issues.find((i) => i.path.includes('name'))
      expect(nameError?.message).toBe('Ingresá tu nombre completo')
    }
  })

  it('rejects an invalid email format', () => {
    const result = CheckoutSchema.safeParse({
      ...validData,
      customer: { ...validData.customer, email: 'not-an-email' },
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const emailError = result.error.issues.find((i) => i.path.includes('email'))
      expect(emailError?.message).toBe('Email inválido')
    }
  })

  it('rejects customer.phone shorter than 8 characters', () => {
    const result = CheckoutSchema.safeParse({
      ...validData,
      customer: { ...validData.customer, phone: '123' },
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const phoneError = result.error.issues.find((i) => i.path.includes('phone'))
      expect(phoneError?.message).toBe('Ingresá un teléfono válido')
    }
  })

  it('rejects shippingAddress.postalCode shorter than 4 characters', () => {
    const result = CheckoutSchema.safeParse({
      ...validData,
      shippingAddress: { ...validData.shippingAddress, postalCode: '10' },
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const postalError = result.error.issues.find((i) => i.path.includes('postalCode'))
      expect(postalError?.message).toBe('Ingresá el código postal')
    }
  })

  it('rejects an unknown shippingMethod', () => {
    const result = CheckoutSchema.safeParse({
      ...validData,
      shippingMethod: 'drone',
    })
    expect(result.success).toBe(false)
  })

  it('accepts all three valid shipping methods', () => {
    const methods = ['standard', 'express', 'pickup'] as const
    for (const method of methods) {
      const result = CheckoutSchema.safeParse({ ...validData, shippingMethod: method })
      expect(result.success).toBe(true)
    }
  })
})
