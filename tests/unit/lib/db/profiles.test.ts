import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseMock } from '../../../helpers/supabase-mock'

const USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

describe('claimGuestOrders', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('calls claim_guest_orders RPC with the authenticated user id and email', async () => {
    const { client, rpc } = createSupabaseMock({ data: 3, error: null })
    const createAdminClient = vi.fn().mockReturnValue(client)
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient }))

    const { claimGuestOrders } = await import('@/lib/db/profiles')
    const result = await claimGuestOrders(USER_ID, 'ana@example.com')

    expect(createAdminClient).toHaveBeenCalledOnce()
    expect(rpc).toHaveBeenCalledWith('claim_guest_orders', {
      p_user_id: USER_ID,
      p_email: 'ana@example.com',
    })
    expect(result).toBe(3)
  })

  it('returns 0 when the RPC fails', async () => {
    const { client } = createSupabaseMock({
      data: null,
      error: { message: 'rpc failed' },
    })
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn().mockReturnValue(client),
    }))

    const { claimGuestOrders } = await import('@/lib/db/profiles')
    const result = await claimGuestOrders(USER_ID, 'ana@example.com')

    expect(result).toBe(0)
  })
})
