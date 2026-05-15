import { createAdminClient } from '@/lib/supabase/admin'

export async function claimGuestOrders(
  userId: string,
  email: string
): Promise<number> {
  // Service-role required: claiming historical guest orders must bypass customer RLS
  // while the SECURITY DEFINER RPC constrains the mutation by user id + email.
  const supabase = createAdminClient()

  // RPC not yet in generated types — regenerate after running migration 018.
  type ClaimGuestOrdersRpc = (
    fn: 'claim_guest_orders',
    args: { p_user_id: string; p_email: string }
  ) => Promise<{ data: number | null; error: { message: string } | null }>

  const rpc = supabase.rpc as unknown as ClaimGuestOrdersRpc
  const { data, error } = await rpc('claim_guest_orders', {
    p_user_id: userId,
    p_email: email,
  })

  if (error) return 0
  return typeof data === 'number' ? data : 0
}
