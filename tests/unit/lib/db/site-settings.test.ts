import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseMock } from '../../../helpers/supabase-mock'

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeAnonMock(value: Record<string, unknown> | null) {
  const row = value === null ? null : { value }
  return createSupabaseMock({ data: row, error: null })
}

// ─── getHeroConfig ─────────────────────────────────────────────────────────────

describe('getHeroConfig', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns HERO_DEFAULTS when DB row value is empty {}', async () => {
    const { client } = makeAnonMock({})
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(client) }))

    const { getHeroConfig } = await import('@/lib/db/site-settings')
    const result = await getHeroConfig()

    expect(result.title).toBe('Su esencia grabada para siempre')
    expect(result.subtitle).toBe('Piezas personalizadas creadas para celebrar el vínculo con tu mascota')
    expect(result.images).toEqual([])
  })

  it('returns HERO_DEFAULTS when DB row does not exist (null)', async () => {
    const { client } = createSupabaseMock({ data: null, error: null })
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(client) }))

    const { getHeroConfig } = await import('@/lib/db/site-settings')
    const result = await getHeroConfig()

    expect(result.title).toBe('Su esencia grabada para siempre')
    expect(result.images).toEqual([])
  })

  it('uses DB title when present and non-empty', async () => {
    const { client } = makeAnonMock({ title: 'Mi título DB', subtitle: 'Mi subtítulo DB', images: [] })
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(client) }))

    const { getHeroConfig } = await import('@/lib/db/site-settings')
    const result = await getHeroConfig()

    expect(result.title).toBe('Mi título DB')
    expect(result.subtitle).toBe('Mi subtítulo DB')
  })

  it('falls back to HERO_DEFAULTS when title is whitespace-only', async () => {
    const { client } = makeAnonMock({ title: '   ', subtitle: '' })
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(client) }))

    const { getHeroConfig } = await import('@/lib/db/site-settings')
    const result = await getHeroConfig()

    expect(result.title).toBe('Su esencia grabada para siempre')
    expect(result.subtitle).toBe('Piezas personalizadas creadas para celebrar el vínculo con tu mascota')
  })

  it('sorts images by sortOrder and truncates to 3', async () => {
    const images = [
      { url: 'http://example.com/d.jpg', sortOrder: 3 },
      { url: 'http://example.com/b.jpg', sortOrder: 1 },
      { url: 'http://example.com/a.jpg', sortOrder: 0 },
      { url: 'http://example.com/c.jpg', sortOrder: 2 },
      { url: 'http://example.com/e.jpg', sortOrder: 4 },
    ]
    const { client } = makeAnonMock({ images })
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(client) }))

    const { getHeroConfig } = await import('@/lib/db/site-settings')
    const result = await getHeroConfig()

    expect(result.images).toHaveLength(3)
    expect(result.images[0].url).toBe('http://example.com/a.jpg')
    expect(result.images[1].url).toBe('http://example.com/b.jpg')
    expect(result.images[2].url).toBe('http://example.com/c.jpg')
  })
})

// ─── getStoreInfo ──────────────────────────────────────────────────────────────

describe('getStoreInfo', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('merges BRAND defaults when DB row is empty', async () => {
    const { client } = makeAnonMock({})
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(client) }))

    const { getStoreInfo } = await import('@/lib/db/site-settings')
    const result = await getStoreInfo()

    expect(result.name).toBe('Ayla')
    expect(result.email).toBe('supportaylapet@gmail.com')
  })

  it('uses DB value over BRAND when present', async () => {
    const { client } = makeAnonMock({ name: 'Tienda DB', email: 'db@example.com', domain: 'db.com', instagram: 'https://ig.com/db' })
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(client) }))

    const { getStoreInfo } = await import('@/lib/db/site-settings')
    const result = await getStoreInfo()

    expect(result.name).toBe('Tienda DB')
    expect(result.email).toBe('db@example.com')
  })
})

// ─── getTransferInfo ───────────────────────────────────────────────────────────

describe('getTransferInfo', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('merges TRANSFER defaults when DB row is empty', async () => {
    const { client } = makeAnonMock({})
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(client) }))

    const { getTransferInfo } = await import('@/lib/db/site-settings')
    const result = await getTransferInfo()

    expect(result.cbu).toBe('0070693930004003890360')
    expect(result.alias).toBe('Aylapets')
    expect(result.titular).toBe('Jose Alejandro Rimasa')
    expect(result.banco).toBe('Galicia')
  })

  it('uses DB values over TRANSFER when present', async () => {
    const { client } = makeAnonMock({ cbu: '9999999999999999999999', alias: 'NuevoAlias', titular: 'Titular DB', banco: 'Santander' })
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(client) }))

    const { getTransferInfo } = await import('@/lib/db/site-settings')
    const result = await getTransferInfo()

    expect(result.cbu).toBe('9999999999999999999999')
    expect(result.banco).toBe('Santander')
  })
})

// ─── getMaintenanceConfig ──────────────────────────────────────────────────────

describe('getMaintenanceConfig', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns enabled: false by default when row is empty', async () => {
    const { client } = makeAnonMock({})
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(client) }))

    const { getMaintenanceConfig } = await import('@/lib/db/site-settings')
    const result = await getMaintenanceConfig()

    expect(result.enabled).toBe(false)
  })

  it('returns enabled: true only when value is exactly true', async () => {
    const { client } = makeAnonMock({ enabled: true })
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(client) }))

    const { getMaintenanceConfig } = await import('@/lib/db/site-settings')
    const result = await getMaintenanceConfig()

    expect(result.enabled).toBe(true)
  })

  it('returns enabled: false when enabled is truthy-but-not-true (e.g. string "true")', async () => {
    const { client } = makeAnonMock({ enabled: 'true' })
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(client) }))

    const { getMaintenanceConfig } = await import('@/lib/db/site-settings')
    const result = await getMaintenanceConfig()

    expect(result.enabled).toBe(false)
  })
})

// ─── getBrandingConfig ─────────────────────────────────────────────────────────

describe('getBrandingConfig', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns logoUrl: null when DB row is empty', async () => {
    const { client } = makeAnonMock({})
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(client) }))

    const { getBrandingConfig } = await import('@/lib/db/site-settings')
    const result = await getBrandingConfig()

    expect(result.logoUrl).toBeNull()
  })

  it('returns logoUrl from DB when present', async () => {
    const { client } = makeAnonMock({ logoUrl: 'https://cdn.example.com/logo.png' })
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(client) }))

    const { getBrandingConfig } = await import('@/lib/db/site-settings')
    const result = await getBrandingConfig()

    expect(result.logoUrl).toBe('https://cdn.example.com/logo.png')
  })
})

// ─── upsertSetting ─────────────────────────────────────────────────────────────

describe('upsertSetting', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('throws (redirects) when requireAdmin rejects', async () => {
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockRejectedValue(new Error('Unauthorized')),
    }))
    const { client } = createSupabaseMock({ data: null, error: null })
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn().mockReturnValue(client) }))
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(client) }))

    const { upsertSetting } = await import('@/lib/db/site-settings')
    await expect(
      upsertSetting('maintenance', { enabled: true })
    ).rejects.toThrow()

    expect(client.from).not.toHaveBeenCalled()
  })

  it('calls upsert onConflict key and returns { ok: true } on success', async () => {
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }),
    }))
    const { client, chain } = createSupabaseMock({ data: null, error: null })
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn().mockReturnValue(client) }))
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(client) }))

    const { upsertSetting } = await import('@/lib/db/site-settings')
    const result = await upsertSetting('maintenance', { enabled: true })

    expect(client.from).toHaveBeenCalledWith('site_settings')
    expect(chain.upsert).toHaveBeenCalledWith(
      { key: 'maintenance', value: { enabled: true } },
      { onConflict: 'key' }
    )
    expect(result).toEqual({ ok: true })
  })

  it('returns { ok: false, error } when supabase returns error', async () => {
    vi.doMock('@/lib/auth', () => ({
      requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id' }),
    }))
    const { client } = createSupabaseMock({ data: null, error: { message: 'DB error' } })
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn().mockReturnValue(client) }))
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(client) }))

    const { upsertSetting } = await import('@/lib/db/site-settings')
    const result = await upsertSetting('maintenance', { enabled: false })

    expect(result).toEqual({ ok: false, error: 'DB error' })
  })
})
