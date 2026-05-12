import { createAdminClient } from '@/lib/supabase/admin'

interface RecordMPPaymentInput {
  mpPaymentId: string
  orderId: string
  status: string
  amount: number
}

type RecordMPPaymentResult =
  | { ok: true }
  | { ok: false; error: string; isDuplicate: boolean }

// Service-role required: payments table has RLS locked to authenticated users.
// Called from the webhook handler — no user session available.
export async function recordMPPayment(
  input: RecordMPPaymentInput
): Promise<RecordMPPaymentResult> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('payments')
    .insert({
      mp_payment_id: input.mpPaymentId,
      order_id: input.orderId,
      status: input.status,
      amount: input.amount,
    })
    .select()

  if (error) {
    return { ok: false, error: error.message, isDuplicate: error.code === '23505' }
  }

  if (!data || data.length === 0) {
    return { ok: false, error: 'no_rows_inserted', isDuplicate: false }
  }

  return { ok: true }
}
