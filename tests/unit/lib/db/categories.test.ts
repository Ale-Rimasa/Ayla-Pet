import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseMock } from '../../../helpers/supabase-mock'

describe('getCategoriesForAdmin', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('includes deleted rows when includeDeleted is true by not adding deleted_at filter', async () => {
    const rows = [
      {
        id: 'cat-active',
        name: 'Activas',
        slug: 'activas',
        description: null,
        image_url: null,
        sort_order: 1,
        deleted_at: null,
      },
      {
        id: 'cat-deleted',
        name: 'Eliminadas',
        slug: 'eliminadas',
        description: null,
        image_url: null,
        sort_order: 2,
        deleted_at: '2026-01-01T00:00:00Z',
      },
    ]
    const { client, chain } = createSupabaseMock({ data: rows, error: null })
    const createAdminClient = vi.fn().mockReturnValue(client)
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient }))
    vi.doMock('@/lib/auth', () => ({ requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }) }))

    const { getCategoriesForAdmin } = await import('@/lib/db/categories')
    const result = await getCategoriesForAdmin({ includeDeleted: true })

    expect(createAdminClient).toHaveBeenCalledOnce()
    expect(chain.is).not.toHaveBeenCalledWith('deleted_at', null)
    expect(result.map((category) => category.id)).toEqual(['cat-active', 'cat-deleted'])
  })

  it('excludes deleted rows by default by filtering deleted_at IS NULL', async () => {
    const rows = [
      {
        id: 'cat-active',
        name: 'Activas',
        slug: 'activas',
        description: null,
        image_url: null,
        sort_order: 1,
        deleted_at: null,
      },
    ]
    const { client, chain } = createSupabaseMock({ data: rows, error: null })
    const createAdminClient = vi.fn().mockReturnValue(client)
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient }))
    vi.doMock('@/lib/auth', () => ({ requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }) }))

    const { getCategoriesForAdmin } = await import('@/lib/db/categories')
    const result = await getCategoriesForAdmin()

    expect(createAdminClient).toHaveBeenCalledOnce()
    expect(chain.is).toHaveBeenCalledWith('deleted_at', null)
    expect(result).toEqual([
      {
        id: 'cat-active',
        name: 'Activas',
        slug: 'activas',
        description: null,
        imageUrl: undefined,
        sortOrder: 1,
        deletedAt: undefined,
      },
    ])
  })
})
