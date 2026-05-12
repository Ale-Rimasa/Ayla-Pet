import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('logoutAction', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('signs out, revalidates the admin layout, then redirects to login in order', async () => {
    const calls: string[] = []
    const signOut = vi.fn().mockImplementation(async () => {
      calls.push('signOut')
      return { error: null }
    })
    const revalidatePath = vi.fn().mockImplementation(() => {
      calls.push('revalidatePath')
    })
    const redirect = vi.fn().mockImplementation(() => {
      calls.push('redirect')
      throw new Error('NEXT_REDIRECT')
    })

    vi.doMock('@/lib/supabase/server', () => ({
      createClient: vi.fn().mockResolvedValue({ auth: { signOut } }),
    }))
    vi.doMock('next/cache', () => ({ revalidatePath }))
    vi.doMock('next/navigation', () => ({ redirect }))
    vi.doMock('next/headers', () => ({ headers: vi.fn() }))
    vi.doMock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn() }))

    const { logoutAction } = await import('@/lib/actions/auth')
    await expect(logoutAction()).rejects.toThrow('NEXT_REDIRECT')

    expect(signOut).toHaveBeenCalledOnce()
    expect(revalidatePath).toHaveBeenCalledWith('/admin', 'layout')
    expect(redirect).toHaveBeenCalledWith('/admin/login')
    expect(calls).toEqual(['signOut', 'revalidatePath', 'redirect'])
  })
})
