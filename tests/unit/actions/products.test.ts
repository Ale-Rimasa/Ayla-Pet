import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createSupabaseMock } from '../../helpers/supabase-mock'

// Valid RFC 4122 UUIDs for test data
const PRODUCT_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const CATEGORY_UUID = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'
const VARIANT_UUID = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'

describe('createProduct', () => {
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

    const { createProduct } = await import('@/lib/actions/products')
    await expect(
      createProduct({
        name: 'Taza',
        slug: 'taza',
        category_id: CATEGORY_UUID,
        images: [],
        featured: false,
      })
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

    const { createProduct } = await import('@/lib/actions/products')
    const result = await createProduct({
      name: 'Taza',
      slug: 'INVALID SLUG!',
      category_id: CATEGORY_UUID,
      images: [],
      featured: false,
    })

    expect(result).toEqual({ ok: false, error: 'validation_error' })
    expect(client.from).not.toHaveBeenCalled()
  })

  it('inserts product and revalidates paths on success', async () => {
    const revalidatePath = vi.fn()
    const revalidateTag = vi.fn()
    vi.doMock('next/cache', () => ({ revalidatePath, revalidateTag }))
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }),
    }))
    const { client } = createSupabaseMock({ data: { id: PRODUCT_UUID }, error: null })
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn().mockReturnValue(client),
    }))

    const { createProduct } = await import('@/lib/actions/products')
    const result = await createProduct({
      name: 'Taza Ceramica',
      slug: 'taza-ceramica',
      category_id: CATEGORY_UUID,
      images: ['https://example.com/img.jpg'],
      featured: false,
    })

    expect(client.from).toHaveBeenCalledWith('products')
    expect(result).toEqual({ ok: true, data: { id: PRODUCT_UUID } })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/productos')
    expect(revalidatePath).toHaveBeenCalledWith('/productos')
  })
})

describe('softDeleteProduct', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('sets deleted_at on product and physically deletes its variants', async () => {
    const revalidatePath = vi.fn()
    vi.doMock('next/cache', () => ({ revalidatePath, revalidateTag: vi.fn() }))
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }),
    }))
    const { client } = createSupabaseMock({ data: null, error: null })
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn().mockReturnValue(client),
    }))

    const { softDeleteProduct } = await import('@/lib/actions/products')
    const result = await softDeleteProduct(PRODUCT_UUID)

    expect(result).toEqual({ ok: true })
    expect(client.from).toHaveBeenCalledWith('products')
    expect(client.from).toHaveBeenCalledWith('product_variants')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/productos')
    expect(revalidatePath).toHaveBeenCalledWith('/productos')
  })
})

describe('updateProduct', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('updates product record and revalidates paths', async () => {
    const revalidatePath = vi.fn()
    const revalidateTag = vi.fn()
    vi.doMock('next/cache', () => ({ revalidatePath, revalidateTag }))
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }),
    }))
    const { client } = createSupabaseMock({ data: null, error: null })
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn().mockReturnValue(client),
    }))

    const { updateProduct } = await import('@/lib/actions/products')
    const result = await updateProduct({
      id: PRODUCT_UUID,
      name: 'Taza Updated',
      slug: 'taza-updated',
    })

    expect(result).toEqual({ ok: true })
    expect(client.from).toHaveBeenCalledWith('products')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/productos')
  })
})

describe('createVariant', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('inserts variant and calls revalidateTag', async () => {
    const revalidatePath = vi.fn()
    const revalidateTag = vi.fn()
    vi.doMock('next/cache', () => ({ revalidatePath, revalidateTag }))
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }),
    }))
    const { client, chain } = createSupabaseMock({ data: null, error: null })
    chain.maybeSingle = vi.fn().mockResolvedValue({ data: { slug: 'taza' }, error: null })
    chain.single = vi.fn().mockResolvedValue({ data: { id: 'new-variant-uuid' }, error: null })
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn().mockReturnValue(client),
    }))

    const { createVariant } = await import('@/lib/actions/products')
    const result = await createVariant({
      product_id: PRODUCT_UUID,
      name: 'Azul',
      price: 250000,
      stock: 10,
      sort_order: 0,
    })

    expect(result).toEqual({ ok: true, data: { id: 'new-variant-uuid' } })
    expect(client.from).toHaveBeenCalledWith('product_variants')
    expect(revalidateTag).toHaveBeenCalledWith('producto:taza', {})
  })
})

describe('deleteVariant', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('deletes variant record and revalidates', async () => {
    const revalidatePath = vi.fn()
    const revalidateTag = vi.fn()
    vi.doMock('next/cache', () => ({ revalidatePath, revalidateTag }))
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }),
    }))
    const { client, chain } = createSupabaseMock({ data: null, error: null })
    chain.maybeSingle = vi.fn().mockResolvedValue({
      data: { product_id: PRODUCT_UUID, products: { slug: 'taza' } },
      error: null,
    })
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn().mockReturnValue(client),
    }))

    const { deleteVariant } = await import('@/lib/actions/products')
    const result = await deleteVariant(VARIANT_UUID)

    expect(result).toEqual({ ok: true })
    expect(client.from).toHaveBeenCalledWith('product_variants')
  })
})
