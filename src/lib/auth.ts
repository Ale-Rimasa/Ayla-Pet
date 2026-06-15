import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Devuelve true si el usuario actual está autenticado y tiene rol admin.
 * No redirige (a diferencia de requireAdmin) — pensado para gates condicionales
 * como el modo mantenimiento. Cacheado por request para deduplicar la consulta.
 */
export const isAdmin = cache(async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return false

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return (profile as { role: string } | null)?.role === 'admin'
})

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
