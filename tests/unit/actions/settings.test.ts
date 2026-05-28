import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseMock } from '../../helpers/supabase-mock'

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeFile(name: string, type: string, size: number): File {
  const blob = new Blob([new Uint8Array(size)], { type })
  return new File([blob], name, { type })
}

function makeFormData(file: File): FormData {
  const fd = new FormData()
  fd.append('file', file)
  return fd
}

// ─── uploadHeroImage ──────────────────────────────────────────────────────────

describe('uploadHeroImage', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('rejects when requireAdmin throws', async () => {
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockRejectedValue(new Error('Unauthorized')),
    }))
    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }))
    vi.doMock('@/lib/storage', () => ({ uploadImage: vi.fn(), deleteImage: vi.fn() }))
    const { client } = createSupabaseMock({ data: null, error: null })
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(client) }))
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn().mockReturnValue(client) }))

    const { uploadHeroImage } = await import('@/lib/actions/settings')
    const fd = makeFormData(makeFile('img.jpg', 'image/jpeg', 100))
    await expect(uploadHeroImage(fd)).rejects.toThrow()
  })

  it('returns missing_params when no file provided', async () => {
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }),
    }))
    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }))
    vi.doMock('@/lib/storage', () => ({ uploadImage: vi.fn(), deleteImage: vi.fn() }))
    const { client } = createSupabaseMock({ data: { value: { images: [] } }, error: null })
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(client) }))
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn().mockReturnValue(client) }))

    const { uploadHeroImage } = await import('@/lib/actions/settings')
    const fd = new FormData()
    const result = await uploadHeroImage(fd)
    expect(result).toEqual({ ok: false, error: 'missing_params' })
  })

  it('returns invalid_file_type for unsupported mime type', async () => {
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }),
    }))
    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }))
    vi.doMock('@/lib/storage', () => ({ uploadImage: vi.fn(), deleteImage: vi.fn() }))
    const { client } = createSupabaseMock({ data: { value: { images: [] } }, error: null })
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(client) }))
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn().mockReturnValue(client) }))

    const { uploadHeroImage } = await import('@/lib/actions/settings')
    const fd = makeFormData(makeFile('doc.pdf', 'application/pdf', 1000))
    const result = await uploadHeroImage(fd)
    expect(result).toEqual({ ok: false, error: 'invalid_file_type' })
  })

  it('returns file_too_large when size exceeds 5MB', async () => {
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }),
    }))
    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }))
    vi.doMock('@/lib/storage', () => ({ uploadImage: vi.fn(), deleteImage: vi.fn() }))
    const { client } = createSupabaseMock({ data: { value: { images: [] } }, error: null })
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(client) }))
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn().mockReturnValue(client) }))

    const { uploadHeroImage } = await import('@/lib/actions/settings')
    const fd = makeFormData(makeFile('big.jpg', 'image/jpeg', 6 * 1024 * 1024))
    const result = await uploadHeroImage(fd)
    expect(result).toEqual({ ok: false, error: 'file_too_large' })
  })

  it('returns max_images_reached when 3 images already exist', async () => {
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }),
    }))
    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }))
    vi.doMock('@/lib/storage', () => ({ uploadImage: vi.fn(), deleteImage: vi.fn() }))
    const existingImages = [
      { url: 'https://cdn.example.com/1.jpg', sortOrder: 0 },
      { url: 'https://cdn.example.com/2.jpg', sortOrder: 1 },
      { url: 'https://cdn.example.com/3.jpg', sortOrder: 2 },
    ]
    const { client } = createSupabaseMock({ data: { value: { images: existingImages } }, error: null })
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(client) }))
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn().mockReturnValue(client) }))

    const { uploadHeroImage } = await import('@/lib/actions/settings')
    const fd = makeFormData(makeFile('new.jpg', 'image/jpeg', 1000))
    const result = await uploadHeroImage(fd)
    expect(result).toEqual({ ok: false, error: 'max_images_reached' })
  })

  it('uses UUID server-side path (not file.name) and returns image on success', async () => {
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }),
    }))
    const revalidatePath = vi.fn()
    vi.doMock('next/cache', () => ({ revalidatePath }))
    const uploadImage = vi.fn().mockResolvedValue({ ok: true, url: 'https://cdn.example.com/uuid.jpg' })
    vi.doMock('@/lib/storage', () => ({ uploadImage, deleteImage: vi.fn() }))
    const { client } = createSupabaseMock({ data: { value: { images: [] } }, error: null })
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(client) }))
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn().mockReturnValue(client) }))

    const { uploadHeroImage } = await import('@/lib/actions/settings')
    const fd = makeFormData(makeFile('my-photo.jpg', 'image/jpeg', 1000))
    const result = await uploadHeroImage(fd)

    expect(result).toMatchObject({ ok: true })
    // path must NOT contain the original file name
    const [[bucket, path]] = uploadImage.mock.calls
    expect(bucket).toBe('hero')
    expect(path).not.toContain('my-photo')
    // path must be UUID.ext format
    expect(path).toMatch(/^[0-9a-f-]{36}\.jpg$/)

    expect(revalidatePath).toHaveBeenCalledWith('/')
  })
})

// ─── deleteHeroImage ──────────────────────────────────────────────────────────

describe('deleteHeroImage', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('rejects when requireAdmin throws', async () => {
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockRejectedValue(new Error('Unauthorized')),
    }))
    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }))
    vi.doMock('@/lib/storage', () => ({ uploadImage: vi.fn(), deleteImage: vi.fn() }))
    const { client } = createSupabaseMock({ data: null, error: null })
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(client) }))
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn().mockReturnValue(client) }))

    const { deleteHeroImage } = await import('@/lib/actions/settings')
    await expect(deleteHeroImage('https://cdn.example.com/uuid.jpg', 'uuid.jpg')).rejects.toThrow()
  })

  it('removes image by url and renumbers sortOrder from 0', async () => {
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }),
    }))
    const revalidatePath = vi.fn()
    vi.doMock('next/cache', () => ({ revalidatePath }))
    const deleteImage = vi.fn().mockResolvedValue({ ok: true })
    vi.doMock('@/lib/storage', () => ({ uploadImage: vi.fn(), deleteImage }))
    const existingImages = [
      { url: 'https://cdn.example.com/a.jpg', sortOrder: 0 },
      { url: 'https://cdn.example.com/b.jpg', sortOrder: 1 },
      { url: 'https://cdn.example.com/c.jpg', sortOrder: 2 },
    ]
    const { client, chain } = createSupabaseMock({ data: { value: { images: existingImages } }, error: null })
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(client) }))
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn().mockReturnValue(client) }))

    const { deleteHeroImage } = await import('@/lib/actions/settings')
    const result = await deleteHeroImage('https://cdn.example.com/b.jpg', 'b.jpg')

    expect(result).toEqual({ ok: true })
    // upsert should be called with remaining 2 images renumbered 0,1
    const upsertCall = chain.upsert.mock.calls[0][0]
    expect(upsertCall.value.images).toHaveLength(2)
    expect(upsertCall.value.images[0].sortOrder).toBe(0)
    expect(upsertCall.value.images[1].sortOrder).toBe(1)
    expect(upsertCall.value.images[0].url).toBe('https://cdn.example.com/a.jpg')
    expect(upsertCall.value.images[1].url).toBe('https://cdn.example.com/c.jpg')

    expect(deleteImage).toHaveBeenCalledWith('hero', 'b.jpg')
    expect(revalidatePath).toHaveBeenCalledWith('/')
  })
})

// ─── reorderHeroImages ────────────────────────────────────────────────────────

describe('reorderHeroImages', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('reorders images by provided url order and ignores unknown urls', async () => {
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }),
    }))
    const revalidatePath = vi.fn()
    vi.doMock('next/cache', () => ({ revalidatePath }))
    vi.doMock('@/lib/storage', () => ({ uploadImage: vi.fn(), deleteImage: vi.fn() }))
    const existingImages = [
      { url: 'https://cdn.example.com/a.jpg', sortOrder: 0 },
      { url: 'https://cdn.example.com/b.jpg', sortOrder: 1 },
      { url: 'https://cdn.example.com/c.jpg', sortOrder: 2 },
    ]
    const { client, chain } = createSupabaseMock({ data: { value: { images: existingImages } }, error: null })
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(client) }))
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn().mockReturnValue(client) }))

    const { reorderHeroImages } = await import('@/lib/actions/settings')
    // reverse order + include unknown URL that should be ignored
    const result = await reorderHeroImages([
      'https://cdn.example.com/c.jpg',
      'https://cdn.example.com/a.jpg',
      'https://cdn.example.com/unknown.jpg',
    ])

    expect(result).toEqual({ ok: true })
    const upsertCall = chain.upsert.mock.calls[0][0]
    expect(upsertCall.value.images).toHaveLength(2) // unknown is filtered
    expect(upsertCall.value.images[0].url).toBe('https://cdn.example.com/c.jpg')
    expect(upsertCall.value.images[0].sortOrder).toBe(0)
    expect(upsertCall.value.images[1].url).toBe('https://cdn.example.com/a.jpg')
    expect(upsertCall.value.images[1].sortOrder).toBe(1)

    expect(revalidatePath).toHaveBeenCalledWith('/')
  })
})

// ─── updateStoreInfo ──────────────────────────────────────────────────────────

describe('updateStoreInfo', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns validation_error for invalid input (missing email)', async () => {
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }),
    }))
    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }))
    vi.doMock('@/lib/storage', () => ({ uploadImage: vi.fn(), deleteImage: vi.fn() }))
    const { client } = createSupabaseMock({ data: null, error: null })
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(client) }))
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn().mockReturnValue(client) }))

    const { updateStoreInfo } = await import('@/lib/actions/settings')
    const result = await updateStoreInfo({ name: 'Test', email: 'not-an-email', domain: 'd.com', instagram: 'ig' })
    expect(result).toEqual({ ok: false, error: 'validation_error' })
    expect(client.from).not.toHaveBeenCalled()
  })

  it('upserts and revalidates on success', async () => {
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }),
    }))
    const revalidatePath = vi.fn()
    vi.doMock('next/cache', () => ({ revalidatePath }))
    vi.doMock('@/lib/storage', () => ({ uploadImage: vi.fn(), deleteImage: vi.fn() }))
    const { client } = createSupabaseMock({ data: null, error: null })
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(client) }))
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn().mockReturnValue(client) }))

    const { updateStoreInfo } = await import('@/lib/actions/settings')
    const result = await updateStoreInfo({
      name: 'Tienda',
      email: 'hola@tienda.com',
      domain: 'tienda.com',
      instagram: 'https://instagram.com/tienda',
    })
    expect(result).toEqual({ ok: true })
    expect(revalidatePath).toHaveBeenCalledWith('/')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/configuracion')
  })
})

// ─── updateTransferInfo ───────────────────────────────────────────────────────

describe('updateTransferInfo', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns validation_error for empty banco', async () => {
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }),
    }))
    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }))
    vi.doMock('@/lib/storage', () => ({ uploadImage: vi.fn(), deleteImage: vi.fn() }))
    const { client } = createSupabaseMock({ data: null, error: null })
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(client) }))
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn().mockReturnValue(client) }))

    const { updateTransferInfo } = await import('@/lib/actions/settings')
    const result = await updateTransferInfo({ banco: '', titular: 'T', cbu: '1234567890123456789012', alias: 'alias' })
    expect(result).toEqual({ ok: false, error: 'validation_error' })
  })

  it('upserts and revalidates /checkout on success', async () => {
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }),
    }))
    const revalidatePath = vi.fn()
    vi.doMock('next/cache', () => ({ revalidatePath }))
    vi.doMock('@/lib/storage', () => ({ uploadImage: vi.fn(), deleteImage: vi.fn() }))
    const { client } = createSupabaseMock({ data: null, error: null })
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(client) }))
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn().mockReturnValue(client) }))

    const { updateTransferInfo } = await import('@/lib/actions/settings')
    const result = await updateTransferInfo({ banco: 'Galicia', titular: 'Titular', cbu: '0070693930004003890360', alias: 'alias' })
    expect(result).toEqual({ ok: true })
    expect(revalidatePath).toHaveBeenCalledWith('/checkout')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/configuracion')
  })
})

// ─── updateMaintenance ────────────────────────────────────────────────────────

describe('updateMaintenance', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns validation_error for non-boolean input', async () => {
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }),
    }))
    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }))
    vi.doMock('@/lib/storage', () => ({ uploadImage: vi.fn(), deleteImage: vi.fn() }))
    const { client } = createSupabaseMock({ data: null, error: null })
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(client) }))
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn().mockReturnValue(client) }))

    const { updateMaintenance } = await import('@/lib/actions/settings')
    // @ts-expect-error intentional bad input
    const result = await updateMaintenance({ enabled: 'yes' })
    expect(result).toEqual({ ok: false, error: 'validation_error' })
  })

  it('upserts and calls revalidatePath layout on success', async () => {
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }),
    }))
    const revalidatePath = vi.fn()
    vi.doMock('next/cache', () => ({ revalidatePath }))
    vi.doMock('@/lib/storage', () => ({ uploadImage: vi.fn(), deleteImage: vi.fn() }))
    const { client } = createSupabaseMock({ data: null, error: null })
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(client) }))
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn().mockReturnValue(client) }))

    const { updateMaintenance } = await import('@/lib/actions/settings')
    const result = await updateMaintenance({ enabled: true })
    expect(result).toEqual({ ok: true })
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
  })
})

// ─── uploadLogo ───────────────────────────────────────────────────────────────

describe('uploadLogo', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns invalid_file_type for non-image file', async () => {
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }),
    }))
    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }))
    vi.doMock('@/lib/storage', () => ({ uploadImage: vi.fn(), deleteImage: vi.fn() }))
    const { client } = createSupabaseMock({ data: null, error: null })
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(client) }))
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn().mockReturnValue(client) }))

    const { uploadLogo } = await import('@/lib/actions/settings')
    const fd = makeFormData(makeFile('script.js', 'application/javascript', 100))
    const result = await uploadLogo(fd)
    expect(result).toEqual({ ok: false, error: 'invalid_file_type' })
  })

  it('returns file_too_large for logo > 2MB', async () => {
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }),
    }))
    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }))
    vi.doMock('@/lib/storage', () => ({ uploadImage: vi.fn(), deleteImage: vi.fn() }))
    const { client } = createSupabaseMock({ data: null, error: null })
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(client) }))
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn().mockReturnValue(client) }))

    const { uploadLogo } = await import('@/lib/actions/settings')
    const fd = makeFormData(makeFile('big-logo.png', 'image/png', 3 * 1024 * 1024))
    const result = await uploadLogo(fd)
    expect(result).toEqual({ ok: false, error: 'file_too_large' })
  })

  it('uploads to marca bucket and revalidates layout on success', async () => {
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }),
    }))
    const revalidatePath = vi.fn()
    vi.doMock('next/cache', () => ({ revalidatePath }))
    const uploadImage = vi.fn().mockResolvedValue({ ok: true, url: 'https://cdn.example.com/logo-uuid.png' })
    vi.doMock('@/lib/storage', () => ({ uploadImage, deleteImage: vi.fn() }))
    const { client } = createSupabaseMock({ data: null, error: null })
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(client) }))
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn().mockReturnValue(client) }))

    const { uploadLogo } = await import('@/lib/actions/settings')
    const fd = makeFormData(makeFile('logo.png', 'image/png', 1000))
    const result = await uploadLogo(fd)

    expect(result).toMatchObject({ ok: true, url: 'https://cdn.example.com/logo-uuid.png' })
    const [[bucket]] = uploadImage.mock.calls
    expect(bucket).toBe('marca')
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
  })
})

// ─── removeLogo ───────────────────────────────────────────────────────────────

describe('removeLogo', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('rejects when requireAdmin throws', async () => {
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockRejectedValue(new Error('Unauthorized')),
    }))
    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }))
    vi.doMock('@/lib/storage', () => ({ uploadImage: vi.fn(), deleteImage: vi.fn() }))
    const { client } = createSupabaseMock({ data: null, error: null })
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(client) }))
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn().mockReturnValue(client) }))

    const { removeLogo } = await import('@/lib/actions/settings')
    await expect(removeLogo()).rejects.toThrow()
  })

  it('upserts branding with null logoUrl and revalidates layout', async () => {
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }),
    }))
    const revalidatePath = vi.fn()
    vi.doMock('next/cache', () => ({ revalidatePath }))
    vi.doMock('@/lib/storage', () => ({ uploadImage: vi.fn(), deleteImage: vi.fn() }))
    const { client, chain } = createSupabaseMock({ data: null, error: null })
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(client) }))
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn().mockReturnValue(client) }))

    const { removeLogo } = await import('@/lib/actions/settings')
    const result = await removeLogo()

    expect(result).toEqual({ ok: true })
    const upsertCall = chain.upsert.mock.calls[0][0]
    expect(upsertCall.key).toBe('branding')
    expect(upsertCall.value.logoUrl).toBeNull()
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
  })
})
