import { beforeEach, describe, expect, it, vi } from 'vitest'

const USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

function mockSupabase(user: { id: string } | null, role?: string) {
  const single = vi.fn().mockResolvedValue({
    data: role ? { role } : null,
  })
  const eq = vi.fn(() => ({ single }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: user ? null : { message: 'missing session' },
      }),
    },
    from,
  }
}

describe('isAdmin', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns false when there is no authenticated user', async () => {
    vi.doMock('next/navigation', () => ({ redirect: vi.fn() }))
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: vi.fn().mockResolvedValue(mockSupabase(null)),
    }))

    const { isAdmin } = await import('@/lib/auth')
    await expect(isAdmin()).resolves.toBe(false)
  })

  it('returns false when the user role is not admin', async () => {
    vi.doMock('next/navigation', () => ({ redirect: vi.fn() }))
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: vi.fn().mockResolvedValue(mockSupabase({ id: USER_ID }, 'customer')),
    }))

    const { isAdmin } = await import('@/lib/auth')
    await expect(isAdmin()).resolves.toBe(false)
  })

  it('returns true when the user role is admin', async () => {
    vi.doMock('next/navigation', () => ({ redirect: vi.fn() }))
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: vi.fn().mockResolvedValue(mockSupabase({ id: USER_ID }, 'admin')),
    }))

    const { isAdmin } = await import('@/lib/auth')
    await expect(isAdmin()).resolves.toBe(true)
  })
})

describe('requireCustomer', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('redirects unauthenticated customers to login with encoded next path', async () => {
    const redirect = vi.fn((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`)
    })
    vi.doMock('next/navigation', () => ({ redirect }))
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: vi.fn().mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'missing session' },
          }),
        },
      }),
    }))

    const { requireCustomer } = await import('@/lib/auth')

    await expect(requireCustomer('/cuenta/pedidos')).rejects.toThrow(
      'NEXT_REDIRECT:/cuenta/login?next=%2Fcuenta%2Fpedidos'
    )
    expect(redirect).toHaveBeenCalledWith(
      '/cuenta/login?next=%2Fcuenta%2Fpedidos'
    )
  })

  it('returns the authenticated user', async () => {
    const user = { id: USER_ID, email: 'ana@example.com' }
    vi.doMock('next/navigation', () => ({ redirect: vi.fn() }))
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: vi.fn().mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user },
            error: null,
          }),
        },
      }),
    }))

    const { requireCustomer } = await import('@/lib/auth')

    await expect(requireCustomer('/cuenta')).resolves.toEqual(user)
  })
})
