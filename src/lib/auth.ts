import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function getSession() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return null
  return user
}

export async function requireAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/admin/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  if (!profile || (profile as { role: string }).role !== 'admin') {
    redirect('/admin/login')
  }

  return user!
}

export async function requireCustomer(nextPath = '/cuenta') {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect(`/cuenta/login?next=${encodeURIComponent(nextPath)}`)
  }

  return user!
}
