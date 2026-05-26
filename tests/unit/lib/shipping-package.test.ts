import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolveShippingPackages, packagesToSnapshots } from '@/lib/shipping-package'

// Mock del módulo DB — nunca llama a Supabase en tests unitarios
vi.mock('@/lib/db/shipping', () => ({
  getPackageProfilesForVariants: vi.fn(),
}))

import { getPackageProfilesForVariants } from '@/lib/db/shipping'
const mockGetProfiles = vi.mocked(getPackageProfilesForVariants)

// Perfiles de prueba con medidas completas y activos
const MATE_BOX = {
  id: 'mate_box',
  label: 'Caja mate',
  weightG: 600,
  heightMm: 200,
  widthMm: 150,
  lengthMm: 150,
  isActive: true,
}

const SMALL_BOX = {
  id: 'small_accessory_box',
  label: 'Caja accesorio',
  weightG: 120,
  heightMm: 30,
  widthMm: 120,
  lengthMm: 120,
  isActive: true,
}

const MATE_ID = 'variant-mate-uuid'
const PULSERA_ID = 'variant-pulsera-uuid'
const COMBO_2_MATES_ID = 'variant-combo-2mates-uuid'
const COMBO_MATE_PULSERA_ID = 'variant-combo-mate-pulsera-uuid'
const NO_PROFILE_ID = 'variant-no-profile-uuid'
const INACTIVE_ID = 'variant-inactive-uuid'
const INCOMPLETE_ID = 'variant-incomplete-uuid'

const INACTIVE_BOX = { ...MATE_BOX, isActive: false }
const INCOMPLETE_BOX = { ...MATE_BOX, weightG: 0, heightMm: 0, widthMm: 0, lengthMm: 0 }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('resolveShippingPackages', () => {

  // ── T3: 1 mate → [mate_box] ──────────────────────────────────────────────

  it('1 mate → [mate_box]', async () => {
    mockGetProfiles.mockResolvedValue(
      new Map([[MATE_ID, [{ profile: MATE_BOX, quantity: 1 }]]])
    )

    const result = await resolveShippingPackages([{ variantId: MATE_ID, quantity: 1 }])

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.packages).toHaveLength(1)
    expect(result.packages[0].id).toBe('mate_box')
  })

  // ── T4: 2 mates → [mate_box, mate_box] ───────────────────────────────────

  it('2 mates comprados por separado → [mate_box, mate_box]', async () => {
    mockGetProfiles.mockResolvedValue(
      new Map([[MATE_ID, [{ profile: MATE_BOX, quantity: 1 }]]])
    )

    const result = await resolveShippingPackages([{ variantId: MATE_ID, quantity: 2 }])

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.packages).toHaveLength(2)
    expect(result.packages.every((p) => p.id === 'mate_box')).toBe(true)
  })

  // ── T5: mate + pulsera → [mate_box, small_accessory_box] ─────────────────

  it('mate + pulsera → [mate_box, small_accessory_box]', async () => {
    mockGetProfiles.mockResolvedValue(
      new Map([
        [MATE_ID,    [{ profile: MATE_BOX,  quantity: 1 }]],
        [PULSERA_ID, [{ profile: SMALL_BOX, quantity: 1 }]],
      ])
    )

    const result = await resolveShippingPackages([
      { variantId: MATE_ID,    quantity: 1 },
      { variantId: PULSERA_ID, quantity: 1 },
    ])

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.packages).toHaveLength(2)
    expect(result.packages.map((p) => p.id)).toEqual(
      expect.arrayContaining(['mate_box', 'small_accessory_box'])
    )
  })

  // ── T6: combo 2 mates (variante propia) → [mate_box, mate_box] ───────────

  it('combo 2 mates (variante propia con quantity=2) → [mate_box, mate_box]', async () => {
    mockGetProfiles.mockResolvedValue(
      new Map([[COMBO_2_MATES_ID, [{ profile: MATE_BOX, quantity: 2 }]]])
    )

    const result = await resolveShippingPackages([{ variantId: COMBO_2_MATES_ID, quantity: 1 }])

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.packages).toHaveLength(2)
    expect(result.packages.every((p) => p.id === 'mate_box')).toBe(true)
  })

  // ── Combo mate + pulsera (variante propia) ────────────────────────────────

  it('combo mate+pulsera (variante propia con 2 filas) → [mate_box, small_accessory_box]', async () => {
    mockGetProfiles.mockResolvedValue(
      new Map([
        [COMBO_MATE_PULSERA_ID, [
          { profile: MATE_BOX,  quantity: 1 },
          { profile: SMALL_BOX, quantity: 1 },
        ]],
      ])
    )

    const result = await resolveShippingPackages([{ variantId: COMBO_MATE_PULSERA_ID, quantity: 1 }])

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.packages).toHaveLength(2)
    expect(result.packages.map((p) => p.id)).toEqual(
      expect.arrayContaining(['mate_box', 'small_accessory_box'])
    )
  })

  // ── 2 accesorios comprados por separado → [small_box, small_box] ─────────

  it('2 pulseras por separado → [small_accessory_box, small_accessory_box]', async () => {
    mockGetProfiles.mockResolvedValue(
      new Map([[PULSERA_ID, [{ profile: SMALL_BOX, quantity: 1 }]]])
    )

    const result = await resolveShippingPackages([{ variantId: PULSERA_ID, quantity: 2 }])

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.packages).toHaveLength(2)
    expect(result.packages.every((p) => p.id === 'small_accessory_box')).toBe(true)
  })

  // ── T7: sin perfil → missing_profiles ────────────────────────────────────

  it('variant sin filas en variant_shipping_packages → missing_profiles', async () => {
    mockGetProfiles.mockResolvedValue(new Map([[NO_PROFILE_ID, []]]))

    const result = await resolveShippingPackages([{ variantId: NO_PROFILE_ID, quantity: 1 }])

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('missing_profiles')
  })

  // ── T8: perfil inactivo → profile_not_active ──────────────────────────────

  it('perfil inactivo → profile_not_active', async () => {
    mockGetProfiles.mockResolvedValue(
      new Map([[INACTIVE_ID, [{ profile: INACTIVE_BOX, quantity: 1 }]]])
    )

    const result = await resolveShippingPackages([{ variantId: INACTIVE_ID, quantity: 1 }])

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('profile_not_active')
  })

  // ── T9: perfil incompleto → profile_incomplete ────────────────────────────

  it('perfil con medidas en 0 → profile_incomplete', async () => {
    mockGetProfiles.mockResolvedValue(
      new Map([[INCOMPLETE_ID, [{ profile: INCOMPLETE_BOX, quantity: 1 }]]])
    )

    const result = await resolveShippingPackages([{ variantId: INCOMPLETE_ID, quantity: 1 }])

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('profile_incomplete')
  })

  it('carrito vacío → missing_profiles', async () => {
    mockGetProfiles.mockResolvedValue(new Map())
    const result = await resolveShippingPackages([])
    expect(result.ok).toBe(false)
  })
})

// ── T11: cache key diferente para 1 mate vs 2 mates ──────────────────────────

describe('buildCacheKey', () => {
  it('genera claves distintas para 1 bulto vs 2 bultos', async () => {
    const { buildCacheKey } = await import('@/lib/andreani')

    const key1 = buildCacheKey({
      destinationCp: '1414',
      packages: [{ weightG: 600, heightMm: 200, widthMm: 150, lengthMm: 150 }],
      declaredValueCentavos: 500000,
    })

    const key2 = buildCacheKey({
      destinationCp: '1414',
      packages: [
        { weightG: 600, heightMm: 200, widthMm: 150, lengthMm: 150 },
        { weightG: 600, heightMm: 200, widthMm: 150, lengthMm: 150 },
      ],
      declaredValueCentavos: 1000000,
    })

    expect(key1).not.toBe(key2)
  })

  it('genera claves distintas para CPs diferentes', async () => {
    const { buildCacheKey } = await import('@/lib/andreani')
    const pkg = [{ weightG: 600, heightMm: 200, widthMm: 150, lengthMm: 150 }]

    const key1 = buildCacheKey({ destinationCp: '1414', packages: pkg, declaredValueCentavos: 500000 })
    const key2 = buildCacheKey({ destinationCp: '9000', packages: pkg, declaredValueCentavos: 500000 })

    expect(key1).not.toBe(key2)
  })
})

// ── packagesToSnapshots ───────────────────────────────────────────────────────

describe('packagesToSnapshots', () => {
  it('convierte paquetes a snapshots con bultoIndex desde 1', () => {
    const snapshots = packagesToSnapshots([MATE_BOX, SMALL_BOX])

    expect(snapshots).toHaveLength(2)
    expect(snapshots[0].bultoIndex).toBe(1)
    expect(snapshots[0].packageProfileId).toBe('mate_box')
    expect(snapshots[1].bultoIndex).toBe(2)
    expect(snapshots[1].packageProfileId).toBe('small_accessory_box')
  })
})
