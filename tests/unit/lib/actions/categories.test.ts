import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseMock } from '../../../helpers/supabase-mock'

const CATEGORY_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

describe('restoreCategory', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('throws when requireAdmin rejects for a non-admin user', async () => {
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockRejectedValue(new Error('Unauthorized')),
    }))
    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }))
    const { client } = createSupabaseMock({ data: null, error: null })
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn().mockReturnValue(client),
    }))

    const { restoreCategory } = await import('@/lib/actions/categories')
    await expect(restoreCategory(CATEGORY_UUID)).rejects.toThrow('Unauthorized')

    expect(client.from).not.toHaveBeenCalled()
  })

  it('returns validation_error for an invalid uuid', async () => {
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }),
    }))
    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }))
    const { client } = createSupabaseMock({ data: null, error: null })
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn().mockReturnValue(client),
    }))

    const { restoreCategory } = await import('@/lib/actions/categories')
    const result = await restoreCategory('not-a-uuid')

    expect(result).toEqual({ ok: false, error: 'validation_error' })
    expect(client.from).not.toHaveBeenCalled()
  })

  it('sets deleted_at to null and revalidates the admin categories page for a valid uuid', async () => {
    const revalidatePath = vi.fn()
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }),
    }))
    vi.doMock('next/cache', () => ({ revalidatePath }))
    const { client, chain } = createSupabaseMock({ data: null, error: null })
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn().mockReturnValue(client),
    }))

    const { restoreCategory } = await import('@/lib/actions/categories')
    const result = await restoreCategory(CATEGORY_UUID)

    expect(client.from).toHaveBeenCalledWith('categories')
    expect(chain.update).toHaveBeenCalledWith({ deleted_at: null })
    expect(chain.eq).toHaveBeenCalledWith('id', CATEGORY_UUID)
    expect(revalidatePath).toHaveBeenCalledWith('/admin/categorias')
    expect(result).toEqual({ ok: true })
  })
})
