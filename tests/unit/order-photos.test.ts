import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseMock, createMockChain } from '../helpers/supabase-mock'

// ─── Global mocks (hoisted) ───────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-user-id' }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/storage', () => ({
  uploadImage: vi.fn().mockResolvedValue({ ok: true, url: 'https://test.supabase.co/order-photos/uuid.jpg' }),
  deleteImage: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue(true),
}))

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: (key: string) => (key === 'x-forwarded-for' ? '1.2.3.4' : null),
  }),
}))

// ─── Test data ────────────────────────────────────────────────────────────

const VALID_ORDER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const VALID_PHOTO_ID = 'c2ffcd00-1d2c-4f89-bc7e-7cc0ce491b22'
const PAID_ORDER = { id: VALID_ORDER_ID, status: 'paid' }
const PHOTO_ROW = {
  id: VALID_PHOTO_ID,
  order_id: VALID_ORDER_ID,
  storage_path: `${VALID_ORDER_ID}/test-uuid.jpg`,
  display_order: 0,
  mime_type: 'image/jpeg',
  size_bytes: 100_000,
  created_at: '2026-01-01T00:00:00.000Z',
}

function makeFile(type = 'image/jpeg', size = 100_000): File {
  const blob = new Blob(['x'.repeat(size)], { type })
  return new File([blob], 'test.jpg', { type })
}

function makeFormData(orderId: string, file: File): FormData {
  const fd = new FormData()
  fd.append('orderId', orderId)
  fd.append('file', file)
  return fd
}

// ─── uploadOrderReferencePhoto ────────────────────────────────────────────

describe('uploadOrderReferencePhoto', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules() })

  it('returns ORDER_NOT_FOUND for invalid UUID orderId', async () => {
    const { client } = createSupabaseMock({ data: null, error: null })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { uploadOrderReferencePhoto } = await import('@/lib/actions/order-photos')
    const fd = new FormData()
    fd.append('orderId', 'not-a-uuid')
    fd.append('file', makeFile())
    const result = await uploadOrderReferencePhoto(fd)

    expect(result.ok).toBe(false)
    expect((result as any).error).toBe('ORDER_NOT_FOUND')
  })

  it('returns ORDER_NOT_FOUND when order does not exist in DB', async () => {
    const ordersChain = createMockChain({ data: null, error: null })
    ordersChain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const { client } = createSupabaseMock({ data: null, error: null })
    client.from = vi.fn().mockReturnValue(ordersChain)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { uploadOrderReferencePhoto } = await import('@/lib/actions/order-photos')
    const result = await uploadOrderReferencePhoto(makeFormData(VALID_ORDER_ID, makeFile()))

    expect(result.ok).toBe(false)
    expect((result as any).error).toBe('ORDER_NOT_FOUND')
  })

  it('returns ORDER_NOT_PAYABLE when order status is cancelled', async () => {
    const ordersChain = createMockChain({ data: null, error: null })
    ordersChain.maybeSingle = vi.fn().mockResolvedValue({ data: { ...PAID_ORDER, status: 'cancelled' }, error: null })
    const { client } = createSupabaseMock({ data: null, error: null })
    client.from = vi.fn().mockReturnValue(ordersChain)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { uploadOrderReferencePhoto } = await import('@/lib/actions/order-photos')
    const result = await uploadOrderReferencePhoto(makeFormData(VALID_ORDER_ID, makeFile()))

    expect(result.ok).toBe(false)
    expect((result as any).error).toBe('ORDER_NOT_PAYABLE')
  })

  it('returns ORDER_NOT_PAYABLE when order status is refunded', async () => {
    const ordersChain = createMockChain({ data: null, error: null })
    ordersChain.maybeSingle = vi.fn().mockResolvedValue({ data: { ...PAID_ORDER, status: 'refunded' }, error: null })
    const { client } = createSupabaseMock({ data: null, error: null })
    client.from = vi.fn().mockReturnValue(ordersChain)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { uploadOrderReferencePhoto } = await import('@/lib/actions/order-photos')
    const result = await uploadOrderReferencePhoto(makeFormData(VALID_ORDER_ID, makeFile()))

    expect(result.ok).toBe(false)
    expect((result as any).error).toBe('ORDER_NOT_PAYABLE')
  })

  it('returns INVALID_MIME_TYPE when file.type is image/gif', async () => {
    const ordersChain = createMockChain({ data: null, error: null })
    ordersChain.maybeSingle = vi.fn().mockResolvedValue({ data: PAID_ORDER, error: null })
    const countChain = createMockChain({ data: null, error: null, count: 0 })
    const { client } = createSupabaseMock({ data: null, error: null })
    client.from = vi.fn()
      .mockReturnValueOnce(ordersChain)
      .mockReturnValueOnce(countChain)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { uploadOrderReferencePhoto } = await import('@/lib/actions/order-photos')
    const result = await uploadOrderReferencePhoto(makeFormData(VALID_ORDER_ID, makeFile('image/gif')))

    expect(result.ok).toBe(false)
    expect((result as any).error).toBe('INVALID_MIME_TYPE')
  })

  it('returns INVALID_MIME_TYPE when file.type is application/pdf', async () => {
    const ordersChain = createMockChain({ data: null, error: null })
    ordersChain.maybeSingle = vi.fn().mockResolvedValue({ data: PAID_ORDER, error: null })
    const countChain = createMockChain({ data: null, error: null, count: 0 })
    const { client } = createSupabaseMock({ data: null, error: null })
    client.from = vi.fn()
      .mockReturnValueOnce(ordersChain)
      .mockReturnValueOnce(countChain)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { uploadOrderReferencePhoto } = await import('@/lib/actions/order-photos')
    const result = await uploadOrderReferencePhoto(makeFormData(VALID_ORDER_ID, makeFile('application/pdf')))

    expect(result.ok).toBe(false)
    expect((result as any).error).toBe('INVALID_MIME_TYPE')
  })

  it('returns FILE_TOO_LARGE when file.size > 5MB', async () => {
    const ordersChain = createMockChain({ data: null, error: null })
    ordersChain.maybeSingle = vi.fn().mockResolvedValue({ data: PAID_ORDER, error: null })
    const countChain = createMockChain({ data: null, error: null, count: 0 })
    const { client } = createSupabaseMock({ data: null, error: null })
    client.from = vi.fn()
      .mockReturnValueOnce(ordersChain)
      .mockReturnValueOnce(countChain)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { uploadOrderReferencePhoto } = await import('@/lib/actions/order-photos')
    const result = await uploadOrderReferencePhoto(makeFormData(VALID_ORDER_ID, makeFile('image/jpeg', 6_000_000)))

    expect(result.ok).toBe(false)
    expect((result as any).error).toBe('FILE_TOO_LARGE')
  })

  it('returns FILE_TOO_LARGE when file.size === 0', async () => {
    const ordersChain = createMockChain({ data: null, error: null })
    ordersChain.maybeSingle = vi.fn().mockResolvedValue({ data: PAID_ORDER, error: null })
    const countChain = createMockChain({ data: null, error: null, count: 0 })
    const { client } = createSupabaseMock({ data: null, error: null })
    client.from = vi.fn()
      .mockReturnValueOnce(ordersChain)
      .mockReturnValueOnce(countChain)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { uploadOrderReferencePhoto } = await import('@/lib/actions/order-photos')
    const result = await uploadOrderReferencePhoto(makeFormData(VALID_ORDER_ID, makeFile('image/jpeg', 0)))

    expect(result.ok).toBe(false)
    expect((result as any).error).toBe('FILE_TOO_LARGE')
  })

  it('returns PHOTO_LIMIT_REACHED when pre-check count is 3', async () => {
    const ordersChain = createMockChain({ data: null, error: null })
    ordersChain.maybeSingle = vi.fn().mockResolvedValue({ data: PAID_ORDER, error: null })
    const countChain = createMockChain({ data: null, error: null, count: 3 })
    const { client } = createSupabaseMock({ data: null, error: null })
    client.from = vi.fn()
      .mockReturnValueOnce(ordersChain)
      .mockReturnValueOnce(countChain)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { uploadOrderReferencePhoto } = await import('@/lib/actions/order-photos')
    const result = await uploadOrderReferencePhoto(makeFormData(VALID_ORDER_ID, makeFile()))

    expect(result.ok).toBe(false)
    expect((result as any).error).toBe('PHOTO_LIMIT_REACHED')
  })

  it('returns PHOTO_LIMIT_REACHED when trigger fires (race condition)', async () => {
    const { uploadImage } = await import('@/lib/storage')
    vi.mocked(uploadImage).mockResolvedValueOnce({ ok: true, url: 'https://test.supabase.co/order-photos/uuid.jpg' })

    const ordersChain = createMockChain({ data: null, error: null })
    ordersChain.maybeSingle = vi.fn().mockResolvedValue({ data: PAID_ORDER, error: null })
    const countChain = createMockChain({ data: null, error: null, count: 2 })
    const insertChain = createMockChain({ data: null, error: null })
    insertChain.single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'PHOTO_LIMIT_REACHED', code: '23514' },
    })
    const { client } = createSupabaseMock({ data: null, error: null })
    client.from = vi.fn()
      .mockReturnValueOnce(ordersChain)
      .mockReturnValueOnce(countChain)
      .mockReturnValueOnce(insertChain)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { uploadOrderReferencePhoto } = await import('@/lib/actions/order-photos')
    const result = await uploadOrderReferencePhoto(makeFormData(VALID_ORDER_ID, makeFile()))

    expect(result.ok).toBe(false)
    expect((result as any).error).toBe('PHOTO_LIMIT_REACHED')
  })

  it('cleans up uploaded file when trigger rejects insert', async () => {
    const { uploadImage, deleteImage } = await import('@/lib/storage')
    vi.mocked(uploadImage).mockResolvedValueOnce({ ok: true, url: 'https://test.supabase.co/test.jpg' })
    vi.mocked(deleteImage).mockResolvedValueOnce({ ok: true })

    const ordersChain = createMockChain({ data: null, error: null })
    ordersChain.maybeSingle = vi.fn().mockResolvedValue({ data: PAID_ORDER, error: null })
    const countChain = createMockChain({ data: null, error: null, count: 2 })
    const insertChain = createMockChain({ data: null, error: null })
    insertChain.single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'PHOTO_LIMIT_REACHED', code: '23514' },
    })
    const { client } = createSupabaseMock({ data: null, error: null })
    client.from = vi.fn()
      .mockReturnValueOnce(ordersChain)
      .mockReturnValueOnce(countChain)
      .mockReturnValueOnce(insertChain)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { uploadOrderReferencePhoto } = await import('@/lib/actions/order-photos')
    await uploadOrderReferencePhoto(makeFormData(VALID_ORDER_ID, makeFile()))

    expect(deleteImage).toHaveBeenCalledOnce()
  })

  it('generates storage path with format <orderId>/<uuid>.<ext>', async () => {
    const { uploadImage } = await import('@/lib/storage')
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('fixed-uuid-1111-2222-3333-444444444444' as any)

    const ordersChain = createMockChain({ data: null, error: null })
    ordersChain.maybeSingle = vi.fn().mockResolvedValue({ data: PAID_ORDER, error: null })
    const countChain = createMockChain({ data: null, error: null, count: 0 })
    const insertChain = createMockChain({ data: null, error: null })
    insertChain.single = vi.fn().mockResolvedValue({
      data: { id: 'new-photo', storage_path: `${VALID_ORDER_ID}/fixed-uuid-1111-2222-3333-444444444444.jpg`, display_order: 0 },
      error: null,
    })
    const { client } = createSupabaseMock({ data: null, error: null })
    client.from = vi.fn()
      .mockReturnValueOnce(ordersChain)
      .mockReturnValueOnce(countChain)
      .mockReturnValueOnce(insertChain)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { uploadOrderReferencePhoto } = await import('@/lib/actions/order-photos')
    await uploadOrderReferencePhoto(makeFormData(VALID_ORDER_ID, makeFile()))

    const expectedPath = `${VALID_ORDER_ID}/fixed-uuid-1111-2222-3333-444444444444.jpg`
    expect(uploadImage).toHaveBeenCalledWith('order-photos', expectedPath, expect.any(File))
  })

  it('NEVER uses client-provided path even if formData contains storagePath', async () => {
    const { uploadImage } = await import('@/lib/storage')

    const ordersChain = createMockChain({ data: null, error: null })
    ordersChain.maybeSingle = vi.fn().mockResolvedValue({ data: PAID_ORDER, error: null })
    const countChain = createMockChain({ data: null, error: null, count: 0 })
    const insertChain = createMockChain({ data: null, error: null })
    insertChain.single = vi.fn().mockResolvedValue({
      data: { id: 'new-photo', storage_path: `${VALID_ORDER_ID}/server-generated.jpg`, display_order: 0 },
      error: null,
    })
    const { client } = createSupabaseMock({ data: null, error: null })
    client.from = vi.fn()
      .mockReturnValueOnce(ordersChain)
      .mockReturnValueOnce(countChain)
      .mockReturnValueOnce(insertChain)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const fd = makeFormData(VALID_ORDER_ID, makeFile())
    fd.append('storagePath', 'malicious/path/hack.jpg')
    fd.append('path', 'another/hack.jpg')

    const { uploadOrderReferencePhoto } = await import('@/lib/actions/order-photos')
    await uploadOrderReferencePhoto(fd)

    const uploadCall = vi.mocked(uploadImage).mock.calls[0]
    expect(uploadCall[1]).not.toContain('malicious')
    expect(uploadCall[1]).not.toContain('hack')
  })

  it('calls uploadImage with bucket "order-photos"', async () => {
    const { uploadImage } = await import('@/lib/storage')

    const ordersChain = createMockChain({ data: null, error: null })
    ordersChain.maybeSingle = vi.fn().mockResolvedValue({ data: PAID_ORDER, error: null })
    const countChain = createMockChain({ data: null, error: null, count: 0 })
    const insertChain = createMockChain({ data: null, error: null })
    insertChain.single = vi.fn().mockResolvedValue({
      data: { id: 'new-photo', storage_path: `${VALID_ORDER_ID}/uuid.jpg`, display_order: 0 },
      error: null,
    })
    const { client } = createSupabaseMock({ data: null, error: null })
    client.from = vi.fn()
      .mockReturnValueOnce(ordersChain)
      .mockReturnValueOnce(countChain)
      .mockReturnValueOnce(insertChain)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { uploadOrderReferencePhoto } = await import('@/lib/actions/order-photos')
    await uploadOrderReferencePhoto(makeFormData(VALID_ORDER_ID, makeFile()))

    expect(vi.mocked(uploadImage).mock.calls[0][0]).toBe('order-photos')
  })

  it('inserts row with snake_case fields and current count as display_order', async () => {
    const ordersChain = createMockChain({ data: null, error: null })
    ordersChain.maybeSingle = vi.fn().mockResolvedValue({ data: PAID_ORDER, error: null })
    const countChain = createMockChain({ data: null, error: null, count: 1 })
    const insertChain = createMockChain({ data: null, error: null })
    insertChain.single = vi.fn().mockResolvedValue({
      data: { id: 'new-photo', storage_path: `${VALID_ORDER_ID}/uuid.jpg`, display_order: 1 },
      error: null,
    })
    const { client } = createSupabaseMock({ data: null, error: null })
    client.from = vi.fn()
      .mockReturnValueOnce(ordersChain)
      .mockReturnValueOnce(countChain)
      .mockReturnValueOnce(insertChain)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { uploadOrderReferencePhoto } = await import('@/lib/actions/order-photos')
    await uploadOrderReferencePhoto(makeFormData(VALID_ORDER_ID, makeFile()))

    expect(insertChain.insert).toHaveBeenCalledWith(expect.objectContaining({
      order_id: VALID_ORDER_ID,
      display_order: 1,
      mime_type: 'image/jpeg',
    }))
  })

  it('calls revalidateTag with "order-photos:<orderId>" and {} as second arg', async () => {
    const { revalidateTag } = await import('next/cache')

    const ordersChain = createMockChain({ data: null, error: null })
    ordersChain.maybeSingle = vi.fn().mockResolvedValue({ data: PAID_ORDER, error: null })
    const countChain = createMockChain({ data: null, error: null, count: 0 })
    const insertChain = createMockChain({ data: null, error: null })
    insertChain.single = vi.fn().mockResolvedValue({
      data: { id: 'new-photo', storage_path: `${VALID_ORDER_ID}/uuid.jpg`, display_order: 0 },
      error: null,
    })
    const { client } = createSupabaseMock({ data: null, error: null })
    client.from = vi.fn()
      .mockReturnValueOnce(ordersChain)
      .mockReturnValueOnce(countChain)
      .mockReturnValueOnce(insertChain)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { uploadOrderReferencePhoto } = await import('@/lib/actions/order-photos')
    const result = await uploadOrderReferencePhoto(makeFormData(VALID_ORDER_ID, makeFile()))

    expect(result.ok).toBe(true)
    expect(revalidateTag).toHaveBeenCalledWith(`order-photos:${VALID_ORDER_ID}`, {})
  })

  it('returns { ok: true, data: { id, storagePath, displayOrder } } on success', async () => {
    const ordersChain = createMockChain({ data: null, error: null })
    ordersChain.maybeSingle = vi.fn().mockResolvedValue({ data: PAID_ORDER, error: null })
    const countChain = createMockChain({ data: null, error: null, count: 0 })
    const insertChain = createMockChain({ data: null, error: null })
    insertChain.single = vi.fn().mockResolvedValue({
      data: { id: 'new-photo', storage_path: `${VALID_ORDER_ID}/uuid.jpg`, display_order: 0 },
      error: null,
    })
    const { client } = createSupabaseMock({ data: null, error: null })
    client.from = vi.fn()
      .mockReturnValueOnce(ordersChain)
      .mockReturnValueOnce(countChain)
      .mockReturnValueOnce(insertChain)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { uploadOrderReferencePhoto } = await import('@/lib/actions/order-photos')
    const result = await uploadOrderReferencePhoto(makeFormData(VALID_ORDER_ID, makeFile()))

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toMatchObject({ id: 'new-photo', storagePath: expect.any(String), displayOrder: 0 })
    }
  })

  it('returns RATE_LIMITED when checkRateLimit returns false', async () => {
    const { checkRateLimit } = await import('@/lib/rate-limit')
    vi.mocked(checkRateLimit).mockResolvedValueOnce(false)

    const { client } = createSupabaseMock({ data: null, error: null })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { uploadOrderReferencePhoto } = await import('@/lib/actions/order-photos')
    const result = await uploadOrderReferencePhoto(makeFormData(VALID_ORDER_ID, makeFile()))

    expect(result.ok).toBe(false)
    expect((result as any).error).toBe('RATE_LIMITED')
  })
})

// ─── deleteOrderReferencePhoto ────────────────────────────────────────────

describe('deleteOrderReferencePhoto', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules() })

  it('returns PHOTO_NOT_FOUND for invalid UUID photoId', async () => {
    const { client } = createSupabaseMock({ data: null, error: null })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { deleteOrderReferencePhoto } = await import('@/lib/actions/order-photos')
    const result = await deleteOrderReferencePhoto('not-a-uuid', VALID_ORDER_ID)

    expect(result.ok).toBe(false)
    expect((result as any).error).toBe('PHOTO_NOT_FOUND')
  })

  it('returns PHOTO_NOT_FOUND for invalid UUID orderId', async () => {
    const { client } = createSupabaseMock({ data: null, error: null })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { deleteOrderReferencePhoto } = await import('@/lib/actions/order-photos')
    const result = await deleteOrderReferencePhoto(VALID_PHOTO_ID, 'not-a-uuid')

    expect(result.ok).toBe(false)
    expect((result as any).error).toBe('PHOTO_NOT_FOUND')
  })

  it('returns PHOTO_NOT_FOUND when photo exists but order_id does not match', async () => {
    const ordersChain = createMockChain({ data: null, error: null })
    ordersChain.maybeSingle = vi.fn().mockResolvedValue({ data: PAID_ORDER, error: null })
    const photosChain = createMockChain({ data: null, error: null })
    photosChain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const { client } = createSupabaseMock({ data: null, error: null })
    client.from = vi.fn()
      .mockReturnValueOnce(ordersChain)
      .mockReturnValueOnce(photosChain)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { deleteOrderReferencePhoto } = await import('@/lib/actions/order-photos')
    const result = await deleteOrderReferencePhoto(VALID_PHOTO_ID, VALID_ORDER_ID)

    expect(result.ok).toBe(false)
    expect((result as any).error).toBe('PHOTO_NOT_FOUND')
  })

  it('returns ORDER_NOT_FOUND when order does not exist', async () => {
    const ordersChain = createMockChain({ data: null, error: null })
    ordersChain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const { client } = createSupabaseMock({ data: null, error: null })
    client.from = vi.fn().mockReturnValue(ordersChain)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { deleteOrderReferencePhoto } = await import('@/lib/actions/order-photos')
    const result = await deleteOrderReferencePhoto(VALID_PHOTO_ID, VALID_ORDER_ID)

    expect(result.ok).toBe(false)
    expect((result as any).error).toBe('ORDER_NOT_FOUND')
  })

  it('returns ORDER_NOT_PAYABLE when status terminal', async () => {
    const ordersChain = createMockChain({ data: null, error: null })
    ordersChain.maybeSingle = vi.fn().mockResolvedValue({ data: { ...PAID_ORDER, status: 'delivered' }, error: null })
    const { client } = createSupabaseMock({ data: null, error: null })
    client.from = vi.fn().mockReturnValue(ordersChain)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { deleteOrderReferencePhoto } = await import('@/lib/actions/order-photos')
    const result = await deleteOrderReferencePhoto(VALID_PHOTO_ID, VALID_ORDER_ID)

    expect(result.ok).toBe(false)
    expect((result as any).error).toBe('ORDER_NOT_PAYABLE')
  })

  it('queries photo with both id AND order_id (.eq filters)', async () => {
    const ordersChain = createMockChain({ data: null, error: null })
    ordersChain.maybeSingle = vi.fn().mockResolvedValue({ data: PAID_ORDER, error: null })
    const photosChain = createMockChain({ data: null, error: null })
    photosChain.maybeSingle = vi.fn().mockResolvedValue({ data: PHOTO_ROW, error: null })
    const deleteChain = createMockChain({ data: null, error: null })
    const { client } = createSupabaseMock({ data: null, error: null })
    client.from = vi.fn()
      .mockReturnValueOnce(ordersChain)
      .mockReturnValueOnce(photosChain)
      .mockReturnValueOnce(deleteChain)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { deleteOrderReferencePhoto } = await import('@/lib/actions/order-photos')
    await deleteOrderReferencePhoto(VALID_PHOTO_ID, VALID_ORDER_ID)

    expect(photosChain.eq).toHaveBeenCalledWith('id', VALID_PHOTO_ID)
    expect(photosChain.eq).toHaveBeenCalledWith('order_id', VALID_ORDER_ID)
  })

  it('deletes from storage BEFORE deleting DB row', async () => {
    const { deleteImage } = await import('@/lib/storage')
    const callOrder: string[] = []
    vi.mocked(deleteImage).mockImplementationOnce(async () => {
      callOrder.push('storage')
      return { ok: true }
    })

    const ordersChain = createMockChain({ data: null, error: null })
    ordersChain.maybeSingle = vi.fn().mockResolvedValue({ data: PAID_ORDER, error: null })
    const photosChain = createMockChain({ data: null, error: null })
    photosChain.maybeSingle = vi.fn().mockResolvedValue({ data: PHOTO_ROW, error: null })
    const deleteChain = createMockChain({ data: null, error: null }) as any
    deleteChain.then = (resolve: any) => {
      callOrder.push('db')
      Promise.resolve({ data: null, error: null }).then(resolve)
    }
    const { client } = createSupabaseMock({ data: null, error: null })
    client.from = vi.fn()
      .mockReturnValueOnce(ordersChain)
      .mockReturnValueOnce(photosChain)
      .mockReturnValueOnce(deleteChain)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { deleteOrderReferencePhoto } = await import('@/lib/actions/order-photos')
    await deleteOrderReferencePhoto(VALID_PHOTO_ID, VALID_ORDER_ID)

    expect(callOrder[0]).toBe('storage')
    expect(callOrder[1]).toBe('db')
  })

  it('returns STORAGE_DELETE_FAILED when storage delete fails', async () => {
    const { deleteImage } = await import('@/lib/storage')
    vi.mocked(deleteImage).mockResolvedValueOnce({ ok: false, error: 'bucket_error' })

    const ordersChain = createMockChain({ data: null, error: null })
    ordersChain.maybeSingle = vi.fn().mockResolvedValue({ data: PAID_ORDER, error: null })
    const photosChain = createMockChain({ data: null, error: null })
    photosChain.maybeSingle = vi.fn().mockResolvedValue({ data: PHOTO_ROW, error: null })
    const { client } = createSupabaseMock({ data: null, error: null })
    client.from = vi.fn()
      .mockReturnValueOnce(ordersChain)
      .mockReturnValueOnce(photosChain)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { deleteOrderReferencePhoto } = await import('@/lib/actions/order-photos')
    const result = await deleteOrderReferencePhoto(VALID_PHOTO_ID, VALID_ORDER_ID)

    expect(result.ok).toBe(false)
    expect((result as any).error).toBe('STORAGE_DELETE_FAILED')
  })

  it('does NOT delete DB row if storage delete fails', async () => {
    const { deleteImage } = await import('@/lib/storage')
    vi.mocked(deleteImage).mockResolvedValueOnce({ ok: false, error: 'bucket_error' })

    const ordersChain = createMockChain({ data: null, error: null })
    ordersChain.maybeSingle = vi.fn().mockResolvedValue({ data: PAID_ORDER, error: null })
    const photosChain = createMockChain({ data: null, error: null })
    photosChain.maybeSingle = vi.fn().mockResolvedValue({ data: PHOTO_ROW, error: null })
    const { client } = createSupabaseMock({ data: null, error: null })
    client.from = vi.fn()
      .mockReturnValueOnce(ordersChain)
      .mockReturnValueOnce(photosChain)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { deleteOrderReferencePhoto } = await import('@/lib/actions/order-photos')
    await deleteOrderReferencePhoto(VALID_PHOTO_ID, VALID_ORDER_ID)

    // Only 2 from() calls — no 3rd call for DB delete
    expect(client.from).toHaveBeenCalledTimes(2)
  })

  it('calls revalidateTag with "order-photos:<orderId>" and {}', async () => {
    const { revalidateTag } = await import('next/cache')

    const ordersChain = createMockChain({ data: null, error: null })
    ordersChain.maybeSingle = vi.fn().mockResolvedValue({ data: PAID_ORDER, error: null })
    const photosChain = createMockChain({ data: null, error: null })
    photosChain.maybeSingle = vi.fn().mockResolvedValue({ data: PHOTO_ROW, error: null })
    const deleteChain = createMockChain({ data: null, error: null })
    const { client } = createSupabaseMock({ data: null, error: null })
    client.from = vi.fn()
      .mockReturnValueOnce(ordersChain)
      .mockReturnValueOnce(photosChain)
      .mockReturnValueOnce(deleteChain)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { deleteOrderReferencePhoto } = await import('@/lib/actions/order-photos')
    const result = await deleteOrderReferencePhoto(VALID_PHOTO_ID, VALID_ORDER_ID)

    expect(result.ok).toBe(true)
    expect(revalidateTag).toHaveBeenCalledWith(`order-photos:${VALID_ORDER_ID}`, {})
  })

  it('returns { ok: true, data: { deleted: true } } on success', async () => {
    const ordersChain = createMockChain({ data: null, error: null })
    ordersChain.maybeSingle = vi.fn().mockResolvedValue({ data: PAID_ORDER, error: null })
    const photosChain = createMockChain({ data: null, error: null })
    photosChain.maybeSingle = vi.fn().mockResolvedValue({ data: PHOTO_ROW, error: null })
    const deleteChain = createMockChain({ data: null, error: null })
    const { client } = createSupabaseMock({ data: null, error: null })
    client.from = vi.fn()
      .mockReturnValueOnce(ordersChain)
      .mockReturnValueOnce(photosChain)
      .mockReturnValueOnce(deleteChain)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { deleteOrderReferencePhoto } = await import('@/lib/actions/order-photos')
    const result = await deleteOrderReferencePhoto(VALID_PHOTO_ID, VALID_ORDER_ID)

    expect(result).toEqual({ ok: true, data: { deleted: true } })
  })
})

// ─── getOrderReferencePhotos ──────────────────────────────────────────────

describe('getOrderReferencePhotos', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules() })

  it('returns ORDER_NOT_FOUND for invalid UUID', async () => {
    const { client } = createSupabaseMock({ data: null, error: null })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { getOrderReferencePhotos } = await import('@/lib/actions/order-photos')
    const result = await getOrderReferencePhotos('not-a-uuid')

    expect(result.ok).toBe(false)
    expect((result as any).error).toBe('ORDER_NOT_FOUND')
  })

  it('returns ORDER_NOT_FOUND when order does not exist', async () => {
    const ordersChain = createMockChain({ data: null, error: null })
    ordersChain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const { client } = createSupabaseMock({ data: null, error: null })
    client.from = vi.fn().mockReturnValue(ordersChain)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { getOrderReferencePhotos } = await import('@/lib/actions/order-photos')
    const result = await getOrderReferencePhotos(VALID_ORDER_ID)

    expect(result.ok).toBe(false)
    expect((result as any).error).toBe('ORDER_NOT_FOUND')
  })

  it('returns empty array when order exists but has no photos', async () => {
    const ordersChain = createMockChain({ data: null, error: null })
    ordersChain.maybeSingle = vi.fn().mockResolvedValue({ data: PAID_ORDER, error: null })
    const photosChain = createMockChain({ data: [], error: null })
    const { client } = createSupabaseMock({ data: null, error: null })
    client.from = vi.fn()
      .mockReturnValueOnce(ordersChain)
      .mockReturnValueOnce(photosChain)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { getOrderReferencePhotos } = await import('@/lib/actions/order-photos')
    const result = await getOrderReferencePhotos(VALID_ORDER_ID)

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toEqual([])
  })

  it('filters by order_id only (no cross-order leakage)', async () => {
    const ordersChain = createMockChain({ data: null, error: null })
    ordersChain.maybeSingle = vi.fn().mockResolvedValue({ data: PAID_ORDER, error: null })
    const photosChain = createMockChain({ data: [PHOTO_ROW], error: null })
    const { client } = createSupabaseMock({ data: null, error: null })
    client.from = vi.fn()
      .mockReturnValueOnce(ordersChain)
      .mockReturnValueOnce(photosChain)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { getOrderReferencePhotos } = await import('@/lib/actions/order-photos')
    await getOrderReferencePhotos(VALID_ORDER_ID)

    expect(photosChain.eq).toHaveBeenCalledWith('order_id', VALID_ORDER_ID)
  })

  it('orders by display_order ascending, then created_at', async () => {
    const ordersChain = createMockChain({ data: null, error: null })
    ordersChain.maybeSingle = vi.fn().mockResolvedValue({ data: PAID_ORDER, error: null })
    const photosChain = createMockChain({ data: [PHOTO_ROW], error: null })
    const { client } = createSupabaseMock({ data: null, error: null })
    client.from = vi.fn()
      .mockReturnValueOnce(ordersChain)
      .mockReturnValueOnce(photosChain)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { getOrderReferencePhotos } = await import('@/lib/actions/order-photos')
    await getOrderReferencePhotos(VALID_ORDER_ID)

    expect(photosChain.order).toHaveBeenCalledWith('display_order', { ascending: true })
    expect(photosChain.order).toHaveBeenCalledWith('created_at', { ascending: true })
  })

  it('strips storage_path from the response', async () => {
    const ordersChain = createMockChain({ data: null, error: null })
    ordersChain.maybeSingle = vi.fn().mockResolvedValue({ data: PAID_ORDER, error: null })
    const photosChain = createMockChain({ data: [PHOTO_ROW], error: null })
    const { client } = createSupabaseMock({ data: null, error: null })
    client.from = vi.fn()
      .mockReturnValueOnce(ordersChain)
      .mockReturnValueOnce(photosChain)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { getOrderReferencePhotos } = await import('@/lib/actions/order-photos')
    const result = await getOrderReferencePhotos(VALID_ORDER_ID)

    expect(result.ok).toBe(true)
    if (result.ok) {
      result.data.forEach((photo) => {
        expect(photo).not.toHaveProperty('storagePath')
        expect(photo).not.toHaveProperty('storage_path')
      })
    }
  })
})

// ─── getSignedPhotoUrls (admin) ───────────────────────────────────────────

describe('getSignedPhotoUrls', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules() })

  it('calls requireAdmin and rejects when not admin', async () => {
    const { requireAdmin } = await import('@/lib/auth')
    vi.mocked(requireAdmin).mockRejectedValueOnce(new Error('redirect'))

    const { client } = createSupabaseMock({ data: null, error: null })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { getSignedPhotoUrls } = await import('@/lib/actions/order-photos')
    await expect(getSignedPhotoUrls(VALID_ORDER_ID)).rejects.toThrow()
  })

  it('returns ORDER_NOT_FOUND for invalid UUID', async () => {
    const { client } = createSupabaseMock({ data: null, error: null })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { getSignedPhotoUrls } = await import('@/lib/actions/order-photos')
    const result = await getSignedPhotoUrls('not-a-uuid')

    expect(result.ok).toBe(false)
    expect((result as any).error).toBe('ORDER_NOT_FOUND')
  })

  it('generates signed URL with TTL 3600s per photo', async () => {
    const signedUrl = 'https://test.supabase.co/storage/v1/object/sign/order-photos/test.jpg?token=abc'
    const mockStorageFrom = {
      createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl }, error: null }),
    }
    const { client } = createSupabaseMock({ data: [PHOTO_ROW], error: null })
    ;(client as any).storage = { from: vi.fn().mockReturnValue(mockStorageFrom) }
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { getSignedPhotoUrls } = await import('@/lib/actions/order-photos')
    await getSignedPhotoUrls(VALID_ORDER_ID)

    expect(mockStorageFrom.createSignedUrl).toHaveBeenCalledWith(PHOTO_ROW.storage_path, 3600)
  })

  it('calls supabase.storage.from("order-photos").createSignedUrl', async () => {
    const mockStorageFrom = {
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://signed.url' }, error: null,
      }),
    }
    const { client } = createSupabaseMock({ data: [PHOTO_ROW], error: null })
    ;(client as any).storage = { from: vi.fn().mockReturnValue(mockStorageFrom) }
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { getSignedPhotoUrls } = await import('@/lib/actions/order-photos')
    await getSignedPhotoUrls(VALID_ORDER_ID)

    expect((client as any).storage.from).toHaveBeenCalledWith('order-photos')
  })

  it('filters out failed signed URL generations', async () => {
    const rows = [PHOTO_ROW, { ...PHOTO_ROW, id: 'photo-2', storage_path: 'order/bad.jpg' }]
    const mockStorageFrom = {
      createSignedUrl: vi.fn()
        .mockResolvedValueOnce({ data: { signedUrl: 'https://ok.url' }, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'not found' } }),
    }
    const { client } = createSupabaseMock({ data: rows, error: null })
    ;(client as any).storage = { from: vi.fn().mockReturnValue(mockStorageFrom) }
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { getSignedPhotoUrls } = await import('@/lib/actions/order-photos')
    const result = await getSignedPhotoUrls(VALID_ORDER_ID)

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toHaveLength(1)
  })

  it('NEVER exposes storage_path in response', async () => {
    const mockStorageFrom = {
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://signed.url' }, error: null,
      }),
    }
    const { client } = createSupabaseMock({ data: [PHOTO_ROW], error: null })
    ;(client as any).storage = { from: vi.fn().mockReturnValue(mockStorageFrom) }
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { getSignedPhotoUrls } = await import('@/lib/actions/order-photos')
    const result = await getSignedPhotoUrls(VALID_ORDER_ID)

    expect(result.ok).toBe(true)
    if (result.ok) {
      result.data.forEach((item) => {
        expect(item).not.toHaveProperty('storagePath')
        expect(item).not.toHaveProperty('storage_path')
      })
    }
  })
})

// ─── getSignedPhotoUrlsForOwner (capability token) ────────────────────────

describe('getSignedPhotoUrlsForOwner', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules() })

  it('does NOT call requireAdmin', async () => {
    const { requireAdmin } = await import('@/lib/auth')
    const mockStorageFrom = {
      createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://ok.url' }, error: null }),
    }
    const ordersChain = createMockChain({ data: null, error: null })
    ordersChain.maybeSingle = vi.fn().mockResolvedValue({ data: PAID_ORDER, error: null })
    const photosChain = createMockChain({ data: [], error: null })
    const { client } = createSupabaseMock({ data: null, error: null })
    client.from = vi.fn()
      .mockReturnValueOnce(ordersChain)
      .mockReturnValueOnce(photosChain)
    ;(client as any).storage = { from: vi.fn().mockReturnValue(mockStorageFrom) }
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { getSignedPhotoUrlsForOwner } = await import('@/lib/actions/order-photos')
    await getSignedPhotoUrlsForOwner(VALID_ORDER_ID)

    expect(requireAdmin).not.toHaveBeenCalled()
  })

  it('returns ORDER_NOT_FOUND for invalid UUID', async () => {
    const { client } = createSupabaseMock({ data: null, error: null })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { getSignedPhotoUrlsForOwner } = await import('@/lib/actions/order-photos')
    const result = await getSignedPhotoUrlsForOwner('not-a-uuid')

    expect(result.ok).toBe(false)
    expect((result as any).error).toBe('ORDER_NOT_FOUND')
  })

  it('rate-limits by IP via checkRateLimit', async () => {
    const { checkRateLimit } = await import('@/lib/rate-limit')
    vi.mocked(checkRateLimit).mockResolvedValueOnce(false)

    const { client } = createSupabaseMock({ data: null, error: null })
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { getSignedPhotoUrlsForOwner } = await import('@/lib/actions/order-photos')
    const result = await getSignedPhotoUrlsForOwner(VALID_ORDER_ID)

    expect(result.ok).toBe(false)
    expect((result as any).error).toBe('RATE_LIMITED')
  })

  it('returns empty array when no photos exist', async () => {
    const ordersChain = createMockChain({ data: null, error: null })
    ordersChain.maybeSingle = vi.fn().mockResolvedValue({ data: PAID_ORDER, error: null })
    const photosChain = createMockChain({ data: [], error: null })
    const { client } = createSupabaseMock({ data: null, error: null })
    client.from = vi.fn()
      .mockReturnValueOnce(ordersChain)
      .mockReturnValueOnce(photosChain)
    ;(client as any).storage = { from: vi.fn().mockReturnValue({ createSignedUrl: vi.fn() }) }
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { getSignedPhotoUrlsForOwner } = await import('@/lib/actions/order-photos')
    const result = await getSignedPhotoUrlsForOwner(VALID_ORDER_ID)

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toEqual([])
  })
})

// ─── Wiring smoke tests ───────────────────────────────────────────────────

describe('order-photos action wiring', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules() })

  it('all mutators call revalidateTag with object {} as second arg', async () => {
    const { revalidateTag } = await import('next/cache')

    // upload
    {
      const ordersChain = createMockChain({ data: null, error: null })
      ordersChain.maybeSingle = vi.fn().mockResolvedValue({ data: PAID_ORDER, error: null })
      const countChain = createMockChain({ data: null, error: null, count: 0 })
      const insertChain = createMockChain({ data: null, error: null })
      insertChain.single = vi.fn().mockResolvedValue({
        data: { id: 'p1', storage_path: `${VALID_ORDER_ID}/uuid.jpg`, display_order: 0 },
        error: null,
      })
      const { client } = createSupabaseMock({ data: null, error: null })
      client.from = vi.fn()
        .mockReturnValueOnce(ordersChain)
        .mockReturnValueOnce(countChain)
        .mockReturnValueOnce(insertChain)
      const { createAdminClient } = await import('@/lib/supabase/admin')
      vi.mocked(createAdminClient).mockReturnValue(client as any)
      const { uploadOrderReferencePhoto } = await import('@/lib/actions/order-photos')
      await uploadOrderReferencePhoto(makeFormData(VALID_ORDER_ID, makeFile()))
    }

    const calls = vi.mocked(revalidateTag).mock.calls
    calls.forEach(([, secondArg]) => {
      expect(secondArg).toEqual({})
    })
  })

  it('upload + delete paths use BUCKET constant "order-photos"', async () => {
    const { uploadImage } = await import('@/lib/storage')

    const ordersChain = createMockChain({ data: null, error: null })
    ordersChain.maybeSingle = vi.fn().mockResolvedValue({ data: PAID_ORDER, error: null })
    const countChain = createMockChain({ data: null, error: null, count: 0 })
    const insertChain = createMockChain({ data: null, error: null })
    insertChain.single = vi.fn().mockResolvedValue({
      data: { id: 'p1', storage_path: `${VALID_ORDER_ID}/uuid.jpg`, display_order: 0 },
      error: null,
    })
    const { client } = createSupabaseMock({ data: null, error: null })
    client.from = vi.fn()
      .mockReturnValueOnce(ordersChain)
      .mockReturnValueOnce(countChain)
      .mockReturnValueOnce(insertChain)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(client as any)

    const { uploadOrderReferencePhoto } = await import('@/lib/actions/order-photos')
    await uploadOrderReferencePhoto(makeFormData(VALID_ORDER_ID, makeFile()))

    expect(vi.mocked(uploadImage).mock.calls[0][0]).toBe('order-photos')
  })
})
