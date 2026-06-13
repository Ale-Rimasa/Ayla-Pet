import { describe, it, expect } from 'vitest'
import { CheckoutSchema } from '@/lib/validations'
import { SHIPPING_METHODS } from '@/types/shipping'

const validBase = {
  customer: {
    name: 'Ana García',
    email: 'ana@example.com',
    phone: '1112345678',
  },
  shippingAddress: {
    street: 'Av. Corrientes 1234',
    city: 'CABA',
    province: 'AR-B',
    postalCode: '1043',
  },
  shippingMethod: 'correo-argentino-domicilio' as const,
  paymentMethod: 'transfer' as const,
}

describe('CheckoutSchema — province enum (AR-X codes)', () => {
  it('acepta código AR-B (Buenos Aires)', () => {
    const result = CheckoutSchema.safeParse(validBase)
    expect(result.success).toBe(true)
  })

  it('acepta todos los códigos AR-X de las 24 provincias', () => {
    const codes = ['AR-B','AR-C','AR-K','AR-H','AR-U','AR-X','AR-W','AR-E',
                   'AR-P','AR-Y','AR-L','AR-F','AR-M','AR-N','AR-Q','AR-R',
                   'AR-A','AR-J','AR-D','AR-Z','AR-S','AR-G','AR-V','AR-T']
    for (const code of codes) {
      const result = CheckoutSchema.safeParse({
        ...validBase,
        shippingAddress: { ...validBase.shippingAddress, province: code },
      })
      expect(result.success, `código ${code} debería ser válido`).toBe(true)
    }
  })

  it('rechaza texto libre "Buenos Aires"', () => {
    const result = CheckoutSchema.safeParse({
      ...validBase,
      shippingAddress: { ...validBase.shippingAddress, province: 'Buenos Aires' },
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path.includes('province'))
      expect(err?.message).toBe('Seleccioná una provincia')
    }
  })

  it('rechaza cadena vacía', () => {
    const result = CheckoutSchema.safeParse({
      ...validBase,
      shippingAddress: { ...validBase.shippingAddress, province: '' },
    })
    expect(result.success).toBe(false)
  })
})

describe('CheckoutSchema — observations (max 80 chars)', () => {
  it('acepta observations vacío (undefined)', () => {
    const result = CheckoutSchema.safeParse(validBase)
    expect(result.success).toBe(true)
  })

  it('acepta observations de exactamente 80 caracteres', () => {
    const result = CheckoutSchema.safeParse({
      ...validBase,
      observations: 'a'.repeat(80),
    })
    expect(result.success).toBe(true)
  })

  it('rechaza observations de 81 caracteres', () => {
    const result = CheckoutSchema.safeParse({
      ...validBase,
      observations: 'a'.repeat(81),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path.includes('observations'))
      expect(err?.message).toBe('Máximo 80 caracteres')
    }
  })
})

describe('CheckoutSchema — nuevos shippingMethods', () => {
  it('acepta correo-argentino-domicilio', () => {
    const result = CheckoutSchema.safeParse({
      ...validBase,
      shippingMethod: 'correo-argentino-domicilio',
    })
    expect(result.success).toBe(true)
  })

  it('acepta correo-argentino-sucursal', () => {
    const result = CheckoutSchema.safeParse({
      ...validBase,
      shippingMethod: 'correo-argentino-sucursal',
    })
    expect(result.success).toBe(true)
  })

  it('acepta todos los SHIPPING_METHODS actuales', () => {
    for (const method of SHIPPING_METHODS) {
      const result = CheckoutSchema.safeParse({ ...validBase, shippingMethod: method })
      expect(result.success, `método ${method} debería ser válido`).toBe(true)
    }
  })
})
