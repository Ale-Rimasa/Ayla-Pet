import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseMock } from '../helpers/supabase-mock'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-user-id' }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

// ─── createProductImage ────────────────────────────────────────────────────

describe('createProductImage', () => {
  beforeEach(() => { vi.resetModules() })

  it('inserts a row and returns { ok: true, data }', async () => {
    const row = {
      id: 'img-1', product_id: 'prod-1', url: 'https://x.com/a.jpg',
      alt: null, label: null, sort_order: 0, created_at: '2026-01-01',
    }
    // count query returns single object (not array) → not >= 8 → proceeds to insert
    const { client, chain } = createSupabaseMock({ data: row, error: null })
    chain.single = vi.fn().mockResolvedValue({ data: row, error: null })

    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { createProductImage } = await import('@/lib/actions/products')
    const result = await createProductImage({ productId: 'prod-1', url: 'https://x.com/a.jpg', sortOrder: 0 })

    expect(result.ok).toBe(true)
    expect(client.from).toHaveBeenCalledWith('product_images')
    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({
      product_id: 'prod-1',
      url: 'https://x.com/a.jpg',
      sort_order: 0,
    }))
  })

  it('returns { ok: false, error: max_images_reached } when 8 images already exist', async () => {
    const existingRows = Array.from({ length: 8 }, (_, i) => ({ id: `img-${i}` }))
    const { client } = createSupabaseMock({ data: existingRows, error: null })

    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { createProductImage } = await import('@/lib/actions/products')
    const result = await createProductImage({ productId: 'prod-1', url: 'https://x.com/a.jpg', sortOrder: 8 })

    expect(result.ok).toBe(false)
    expect((result as { ok: false; error: string }).error).toBe('max_images_reached')
  })

  it('returns { ok: false } when supabase insert errors', async () => {
    // count returns null (not array) → proceeds; insert .single() also returns error
    const { client, chain } = createSupabaseMock({ data: null, error: { message: 'db_error' } })
    chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'db_error' } })

    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { createProductImage } = await import('@/lib/actions/products')
    const result = await createProductImage({ productId: 'prod-1', url: 'https://x.com/a.jpg', sortOrder: 0 })

    expect(result.ok).toBe(false)
  })
})

// ─── deleteProductImage ───────────────────────────────────────────────────

describe('deleteProductImage', () => {
  beforeEach(() => { vi.resetModules() })

  it('deletes the row and returns { ok: true }', async () => {
    const { client } = createSupabaseMock({ data: null, error: null })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { deleteProductImage } = await import('@/lib/actions/products')
    const result = await deleteProductImage('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')

    expect(result.ok).toBe(true)
    expect(client.from).toHaveBeenCalledWith('product_images')
  })

  it('returns { ok: false } on supabase error', async () => {
    const { client } = createSupabaseMock({ data: null, error: { message: 'not_found' } })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { deleteProductImage } = await import('@/lib/actions/products')
    const result = await deleteProductImage('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')

    expect(result.ok).toBe(false)
  })

  it('returns { ok: false, error: invalid_id } for non-UUID input', async () => {
    const { client } = createSupabaseMock({ data: null, error: null })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { deleteProductImage } = await import('@/lib/actions/products')
    const result = await deleteProductImage('not-a-uuid')

    expect(result.ok).toBe(false)
    expect((result as { ok: false; error: string }).error).toBe('invalid_id')
  })
})

// ─── updateProductImage ───────────────────────────────────────────────────

describe('updateProductImage', () => {
  beforeEach(() => { vi.resetModules() })

  it('updates alt and label, returns { ok: true }', async () => {
    const { client } = createSupabaseMock({ data: null, error: null })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { updateProductImage } = await import('@/lib/actions/products')
    const result = await updateProductImage({ id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', alt: 'Frente', label: 'Vista frontal' })

    expect(result.ok).toBe(true)
    expect(client.from).toHaveBeenCalledWith('product_images')
  })

  it('returns { ok: false } on supabase error', async () => {
    const { client } = createSupabaseMock({ data: null, error: { message: 'db_error' } })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { updateProductImage } = await import('@/lib/actions/products')
    const result = await updateProductImage({ id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', alt: 'test' })

    expect(result.ok).toBe(false)
  })
})

// ─── reorderProductImages ─────────────────────────────────────────────────

describe('reorderProductImages', () => {
  beforeEach(() => { vi.resetModules() })

  it('updates sort_order for each image and returns { ok: true }', async () => {
    const { client } = createSupabaseMock({ data: null, error: null })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { reorderProductImages } = await import('@/lib/actions/products')
    const result = await reorderProductImages('prod-1', ['img-c', 'img-a', 'img-b'])

    expect(result.ok).toBe(true)
    expect(client.from).toHaveBeenCalledWith('product_images')
  })

  it('returns { ok: false } when any update errors', async () => {
    const { client } = createSupabaseMock({ data: null, error: { message: 'db_error' } })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { reorderProductImages } = await import('@/lib/actions/products')
    const result = await reorderProductImages('prod-1', ['img-a', 'img-b'])

    expect(result.ok).toBe(false)
  })

  it('returns { ok: true } immediately for empty array', async () => {
    const { client } = createSupabaseMock({ data: null, error: null })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { reorderProductImages } = await import('@/lib/actions/products')
    const result = await reorderProductImages('prod-1', [])

    expect(result.ok).toBe(true)
    expect(client.from).not.toHaveBeenCalled()
  })
})
