import { beforeEach, describe, expect, it, vi } from 'vitest'

const USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

function mockRedirect() {
  const redirect = vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`)
  })
  vi.doMock('next/navigation', () => ({ redirect }))
  return redirect
}

describe('customer auth actions', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('signInAction returns ok false for invalid email', async () => {
    mockRedirect()
    const signInWithPassword = vi.fn()
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: vi.fn().mockResolvedValue({ auth: { signInWithPassword } }),
    }))
    vi.doMock('@/lib/db/profiles', () => ({ claimGuestOrders: vi.fn() }))

    const { signInAction } = await import('@/lib/actions/auth')
    const result = await signInAction({
      email: 'invalid',
      password: 'secret123',
    })

    expect(result).toEqual({ ok: false, error: 'validation_error' })
    expect(signInWithPassword).not.toHaveBeenCalled()
  })

  it('signInAction returns the Supabase message for wrong credentials', async () => {
    mockRedirect()
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: vi.fn().mockResolvedValue({
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Invalid login credentials' },
          }),
        },
      }),
    }))
    vi.doMock('@/lib/db/profiles', () => ({ claimGuestOrders: vi.fn() }))

    const { signInAction } = await import('@/lib/actions/auth')
    const result = await signInAction({
      email: 'ana@example.com',
      password: 'secret123',
    })

    expect(result).toEqual({
      ok: false,
      error: 'Invalid login credentials',
    })
  })

  it('signInAction claims guest orders and redirects on valid credentials', async () => {
    const redirect = mockRedirect()
    const claimGuestOrders = vi.fn().mockResolvedValue(2)
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: vi.fn().mockResolvedValue({
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID, email: 'ana@example.com' } },
            error: null,
          }),
        },
      }),
    }))
    vi.doMock('@/lib/db/profiles', () => ({ claimGuestOrders }))

    const { signInAction } = await import('@/lib/actions/auth')

    await expect(
      signInAction(
        { email: 'ana@example.com', password: 'secret123' },
        '/cuenta/pedidos'
      )
    ).rejects.toThrow('NEXT_REDIRECT:/cuenta/pedidos')
    expect(claimGuestOrders).toHaveBeenCalledWith(USER_ID, 'ana@example.com')
    expect(redirect).toHaveBeenCalledWith('/cuenta/pedidos')
  })

  it('signUpAction redirects to verification when email confirmation is required', async () => {
    const redirect = mockRedirect()
    const claimGuestOrders = vi.fn()
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: vi.fn().mockResolvedValue({
        auth: {
          signUp: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID, email: 'ana@example.com' }, session: null },
            error: null,
          }),
        },
      }),
    }))
    vi.doMock('@/lib/db/profiles', () => ({ claimGuestOrders }))

    const { signUpAction } = await import('@/lib/actions/auth')

    await expect(
      signUpAction({
        name: 'Ana Gomez',
        email: 'ana@example.com',
        password: 'secret123',
      })
    ).rejects.toThrow('NEXT_REDIRECT:/cuenta/verificar')
    expect(claimGuestOrders).not.toHaveBeenCalled()
    expect(redirect).toHaveBeenCalledWith('/cuenta/verificar')
  })

  it('signOutAction signs out and redirects home', async () => {
    const redirect = mockRedirect()
    const signOut = vi.fn().mockResolvedValue({ error: null })
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: vi.fn().mockResolvedValue({ auth: { signOut } }),
    }))
    vi.doMock('@/lib/db/profiles', () => ({ claimGuestOrders: vi.fn() }))

    const { signOutAction } = await import('@/lib/actions/auth')

    await expect(signOutAction()).rejects.toThrow('NEXT_REDIRECT:/')
    expect(signOut).toHaveBeenCalledOnce()
    expect(redirect).toHaveBeenCalledWith('/')
  })
})
