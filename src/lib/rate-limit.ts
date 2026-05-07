import { createAdminClient } from '@/lib/supabase/admin'

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const supabase = createAdminClient()
  const windowStart = new Date(Date.now() - windowMs).toISOString()

  const { count, error } = await supabase
    .from('rate_limit_events')
    .select('*', { count: 'exact', head: true })
    .eq('key', key)
    .gte('created_at', windowStart)

  if (error) return true

  if ((count ?? 0) >= limit) return false

  await supabase.from('rate_limit_events').insert({ key })
  return true
}
