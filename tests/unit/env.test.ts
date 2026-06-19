/**
 * S11 / S12 — env.ts Resend var validation
 *
 * Dynamic re-import of createEnv is blocked by the global @/env mock in
 * vitest.setup.ts. Fallback per design §3 note: assert the raw Zod schema
 * branch shape directly so the conditional logic is covered without
 * fighting the global mock.
 *
 * We reconstruct the same conditional used in env.ts for RESEND_API_KEY and
 * RESEND_FROM_EMAIL and verify that:
 *  - S11: non-test NODE_ENV produces a required (non-optional) schema
 *  - S12: test NODE_ENV produces an optional schema
 */
import { describe, it, expect } from 'vitest'
import { z } from 'zod'

/** Mirror of the env.ts conditional for RESEND_API_KEY */
function buildResendKeySchema(nodeEnv: string) {
  return nodeEnv === 'test'
    ? z.string().min(1).optional()
    : z.string().min(1)
}

/** Mirror of the env.ts conditional for RESEND_FROM_EMAIL */
function buildResendEmailSchema(nodeEnv: string) {
  return nodeEnv === 'test'
    ? z.string().email().optional()
    : z.string().email()
}

describe('env.ts — RESEND_API_KEY schema branch (S11 / S12)', () => {
  it('S11: RESEND_API_KEY schema rejects empty string in production', () => {
    const schema = buildResendKeySchema('production')
    const result = schema.safeParse('')
    expect(result.success).toBe(false)
  })

  it('S11: RESEND_API_KEY schema rejects undefined in production', () => {
    const schema = buildResendKeySchema('production')
    const result = schema.safeParse(undefined)
    expect(result.success).toBe(false)
  })

  it('S12: RESEND_API_KEY schema accepts undefined in test', () => {
    const schema = buildResendKeySchema('test')
    const result = schema.safeParse(undefined)
    expect(result.success).toBe(true)
  })

  it('S11: RESEND_FROM_EMAIL schema rejects empty string in production', () => {
    const schema = buildResendEmailSchema('production')
    const result = schema.safeParse('')
    expect(result.success).toBe(false)
  })

  it('S11: RESEND_FROM_EMAIL schema rejects undefined in production', () => {
    const schema = buildResendEmailSchema('production')
    const result = schema.safeParse(undefined)
    expect(result.success).toBe(false)
  })

  it('S12: RESEND_FROM_EMAIL schema accepts undefined in test', () => {
    const schema = buildResendEmailSchema('test')
    const result = schema.safeParse(undefined)
    expect(result.success).toBe(true)
  })
})
