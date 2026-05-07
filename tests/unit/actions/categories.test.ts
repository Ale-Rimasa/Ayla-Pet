import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createSupabaseMock } from '../../helpers/supabase-mock'

describe('createCategory', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('rejects if not admin', async () => {
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockRejectedValue(new Error('Unauthorized')),
    }))
    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }))
    const { client } = createSupabaseMock({ data: null, error: null })
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn().mockReturnValue(client),
    }))

    const { createCategory } = await import('@/lib/actions/categories')
    await expect(
      createCategory({ name: 'Test', slug: 'test', sort_order: 0 })
    ).rejects.toThrow()

    expect(client.from).not.toHaveBeenCalled()
  })

  it('returns validation_error for invalid slug', async () => {
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }),
    }))
    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }))
    const { client } = createSupabaseMock({ data: null, error: null })
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn().mockReturnValue(client),
    }))

    const { createCategory } = await import('@/lib/actions/categories')
    const result = await createCategory({ name: 'Test', slug: 'INVALID SLUG!', sort_order: 0 })

    expect(result).toEqual({ ok: false, error: 'validation_error' })
    expect(client.from).not.toHaveBeenCalled()
  })

  it('inserts category and revalidates paths on success', async () => {
    const revalidatePath = vi.fn()
    vi.doMock('next/cache', () => ({ revalidatePath, revalidateTag: vi.fn() }))
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }),
    }))
    const { client } = createSupabaseMock({ data: { id: 'cat-uuid' }, error: null })
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn().mockReturnValue(client),
    }))

    const { createCategory } = await import('@/lib/actions/categories')
    const result = await createCategory({ name: 'Ceramics', slug: 'ceramics', sort_order: 1 })

    expect(client.from).toHaveBeenCalledWith('categories')
    expect(result).toEqual({ ok: true, data: { id: 'cat-uuid' } })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/categorias')
  })
})

describe('softDeleteCategory', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns category_has_products when active products exist', async () => {
    const revalidatePath = vi.fn()
    vi.doMock('next/cache', () => ({ revalidatePath, revalidateTag: vi.fn() }))
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }),
    }))

    // First from('products') call returns a product (blocked)
    const { client, chain } = createSupabaseMock({ data: [{ id: 'prod-1' }], error: null })
    // Make limit() return our mock with data
    chain.limit = vi.fn().mockResolvedValue({ data: [{ id: 'prod-1' }], error: null })
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn().mockReturnValue(client),
    }))

    const { softDeleteCategory } = await import('@/lib/actions/categories')
    const result = await softDeleteCategory('cat-uuid')

    expect(result).toEqual({ ok: false, error: 'category_has_products' })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('soft deletes and revalidates when no active products exist', async () => {
    const revalidatePath = vi.fn()
    vi.doMock('next/cache', () => ({ revalidatePath, revalidateTag: vi.fn() }))
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }),
    }))

    // No active products — limit() returns empty array
    const { client, chain } = createSupabaseMock({ data: null, error: null })
    chain.limit = vi.fn().mockResolvedValue({ data: [], error: null })
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn().mockReturnValue(client),
    }))

    const { softDeleteCategory } = await import('@/lib/actions/categories')
    const result = await softDeleteCategory('cat-uuid')

    expect(result).toEqual({ ok: true })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/categorias')
    expect(revalidatePath).toHaveBeenCalledWith('/productos')
  })
})
